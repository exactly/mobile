import { vValidator } from "@hono/valibot-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { email, literal, object, parse, pipe, string } from "valibot";

import database, { credentials } from "../database/index";
import auth from "../middleware/auth";
import appOrigin from "../utils/appOrigin";

if (!process.env.PERSONA_URL) throw new Error("missing persona url");
if (!process.env.PERSONA_TEMPLATE_ID) throw new Error("missing persona template id");
if (!process.env.PERSONA_API_KEY) throw new Error("missing persona api key");

const baseURL = process.env.PERSONA_URL;
const templateId = process.env.PERSONA_TEMPLATE_ID;
const authorization = `Bearer ${process.env.PERSONA_API_KEY}`;

const app = new Hono();

app.use("*", auth);

app.get("/", async (c) => {
  const credentialId = c.get("credentialId");
  const credential = await database.query.credentials.findFirst({
    columns: { id: true, kycId: true },
    where: eq(credentials.id, credentialId),
  });
  if (!credential) return c.text("credential not found", 404);
  if (!credential.kycId) return c.text("kyc not found", 404);
  const inquiry = await fetch(`${baseURL}/inquiries/${credential.kycId}`, {
    headers: { authorization, accept: "application/json", "content-type": "application/json" },
  });
  if (!inquiry.ok) return c.json(await inquiry.json(), inquiry.status as StatusCode);
  const { data } = parse(GetInquiryResponse, await inquiry.json());
  if (data.attributes.status !== "approved") return c.json("kyc not approved", 403);
  await database.update(credentials).set({ kyc: true }).where(eq(credentials.id, credentialId));
  return c.json(true);
});

app.post(
  "/",
  vValidator(
    "json",
    object({ name: object({ first: string(), middle: string(), last: string() }), email: pipe(string(), email()) }),
    ({ success, issues }, c) => {
      if (!success) return c.json(issues, 400);
    },
  ),
  async (c) => {
    const credentialId = c.get("credentialId");
    const credential = await database.query.credentials.findFirst({
      columns: { id: true, kycId: true },
      where: eq(credentials.id, credentialId),
    });
    if (!credential) return c.text("credential not found", 404);
    const headers = {
      authorization,
      accept: "application/json",
      "content-type": "application/json",
      "persona-version": "2023-01-05",
    } as const;
    let inquiryId = credential.kycId;
    if (!inquiryId) {
      const create = await fetch(`${baseURL}/inquiries`, {
        headers,
        method: "POST",
        body: JSON.stringify({
          data: {
            attributes: { fields: c.req.valid("json"), "inquiry-template-id": templateId, "redirect-uri": appOrigin },
          },
        }),
      });
      if (!create.ok) return c.json(await create.json(), create.status as StatusCode);
      const { data } = parse(CreateInquiryResponse, await create.json());
      await database
        .update(credentials)
        .set({
          kycId: data.id,
          kycEmail: data.attributes["email-address"],
          kycName: [data.attributes["name-first"], data.attributes["name-middle"], data.attributes["name-last"]]
            .filter(Boolean)
            .join(" "),
        })
        .where(eq(credentials.id, credentialId));
      inquiryId = data.id;
    }
    const otl = await fetch(`${baseURL}/inquiries/${inquiryId}/generate-one-time-link`, {
      method: "POST",
      headers,
    });
    if (!otl.ok) return c.json(await otl.json(), otl.status as StatusCode);
    const { meta } = parse(GenerateOTLResponse, await otl.json());
    return c.json(meta["one-time-link"]);
  },
);

export default app;

const InquiryData = object({
  id: string(),
  type: literal("inquiry"),
  attributes: object({
    "name-first": string(),
    "name-middle": string(),
    "name-last": string(),
    "email-address": string(),
  }),
});

const CreateInquiryResponse = object({ data: InquiryData });

const GetInquiryResponse = object({
  data: object({
    id: string(),
    type: literal("inquiry"),
    attributes: object({ status: string() }),
  }),
});

const GenerateOTLResponse = object({
  data: InquiryData,
  meta: object({ "one-time-link": string(), "one-time-link-short": string() }),
});
