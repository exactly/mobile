import { vValidator } from "@hono/valibot-validator";
import { captureException, getActiveSpan, SEMANTIC_ATTRIBUTE_SENTRY_OP, setContext } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { InferOutput } from "valibot";
import { array, ip, isoTimestamp, literal, looseObject, object, pipe, safeParse, string, transform } from "valibot";

import database, { credentials } from "../database/index";
import { createUser } from "../utils/panda";
import { headerValidator } from "../utils/persona";

const Session = pipe(
  object({
    type: literal("inquiry-session"),
    attributes: object({ createdAt: pipe(string(), isoTimestamp()), ipAddress: pipe(string(), ip()) }),
  }),
  transform((x) => {
    return {
      ...x,
      attributes: {
        createdAt: x.attributes.createdAt,
        IPAddress: x.attributes.ipAddress,
      },
    };
  }),
);

export default new Hono().post(
  "/",
  headerValidator(),
  vValidator(
    "json",
    object({
      data: object({
        attributes: object({
          payload: object({
            data: object({
              id: string(),
              attributes: object({
                status: literal("approved"),
                referenceId: string(),
                fields: object({
                  inputSelect: object({ value: string() }),
                  annualSalary: object({ value: string() }),
                  expectedMonthlyVolume: object({ value: string() }),
                  accountPurpose: object({ value: string() }),
                }),
              }),
            }),
            included: pipe(
              array(looseObject({ type: string() })),
              transform((incl) => {
                return incl
                  .reduce<InferOutput<typeof Session>[]>((sessions, item) => {
                    const s = safeParse(Session, item);
                    if (s.success) return [...sessions, s.output];
                    return sessions;
                  }, [])
                  .sort((a, b) => a.attributes.createdAt.localeCompare(b.attributes.createdAt));
              }),
            ),
          }),
        }),
      }),
    }),
    (validation, c) => {
      if (!validation.success) {
        captureException(new Error("bad persona"), { contexts: { validation } });
        return c.json(
          validation.issues.map((issue) => `${issue.path?.map((p) => p.key).join("/")} ${issue.message}`),
          400,
        );
      }
    },
  ),
  async (c) => {
    getActiveSpan()?.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_OP, "persona.inquiry");

    const payload = c.req.valid("json");
    const {
      data: {
        id: personaShareToken,
        attributes: { fields, referenceId },
      },
      included,
    } = payload.data.attributes.payload;

    setContext("persona", { inquiryId: personaShareToken });

    const session = included[0];
    if (!session) return c.json("no inquiry session", 400);

    const { id } = await createUser({
      accountPurpose: fields.accountPurpose.value,
      annualSalary: fields.annualSalary.value,
      expectedMonthlyVolume: fields.expectedMonthlyVolume.value,
      ipAddress: session.attributes.IPAddress,
      isTermsOfServiceAccepted: true,
      occupation: fields.inputSelect.value,
      personaShareToken,
    });

    await database.update(credentials).set({ pandaId: id }).where(eq(credentials.id, referenceId));

    return c.json({ id }, 200);
  },
);
