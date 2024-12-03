import { vValidator } from "@hono/valibot-validator";
import { captureException } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { array, length, literal, object, pipe, string, variant, type InferInput } from "valibot";

import database, { credentials } from "../database/index";
import { createUser } from "../utils/panda";
import { headerValidator } from "../utils/persona";

const IpAddress = object({
  type: literal("inquiry-session"),
  attributes: object({ status: literal("active"), ipAddress: string() }),
});

const Payload = object({
  data: object({
    attributes: object({
      payload: object({
        data: object({
          id: string(),
          attributes: object({
            status: literal("approved"),
            referenceId: string(),
            fields: object({
              selectedCountryCode: object({ value: pipe(string(), length(2)) }),
              inputSelect: object({ value: string() }),
              annualSalary: object({ value: string() }),
              expectedMonthlyVolume: object({ value: string() }),
              accountPurpose: object({ value: string() }),
            }),
          }),
        }),
        included: array(variant("type", [IpAddress, object({ type: string() })])),
      }),
    }),
  }),
});

export default new Hono().post(
  "/",
  headerValidator(),
  vValidator("json", Payload, (validation, c) => {
    if (!validation.success) {
      captureException(new Error("bad persona"), { contexts: { validation } });
      return c.json(
        validation.issues.map((issue) => `${issue.path?.map((p) => p.key).join("/")} ${issue.message}`),
        400,
      );
    }
  }),
  async (c) => {
    const payload = c.req.valid("json");
    const {
      data: {
        id: personaShareToken,
        attributes: { fields, referenceId },
      },
      included,
    } = payload.data.attributes.payload;

    const session = included.find((x): x is InferInput<typeof IpAddress> => x.type === "inquiry-session");
    if (!session) return c.json("no active inquiry session", 400);

    const { id } = await createUser({
      accountPurpose: fields.accountPurpose.value,
      annualSalary: fields.annualSalary.value,
      expectedMonthlyVolume: fields.expectedMonthlyVolume.value,
      ipAddress: session.attributes.ipAddress,
      isTermsOfServiceAccepted: true,
      occupation: fields.inputSelect.value,
      personaShareToken,
    });

    await database.update(credentials).set({ pandaId: id }).where(eq(credentials.id, referenceId));

    return c.json({ id }, 200);
  },
);
