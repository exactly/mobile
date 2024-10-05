import { type BaseIssue, type BaseSchema, literal, nullable, object, parse, picklist, string, variant } from "valibot";

import appOrigin from "./appOrigin";

if (!process.env.PERSONA_API_KEY) throw new Error("missing persona api key");
if (!process.env.PERSONA_TEMPLATE_ID) throw new Error("missing persona template id");
if (!process.env.PERSONA_URL) throw new Error("missing persona url");

const authorization = `Bearer ${process.env.PERSONA_API_KEY}`;
const templateId = process.env.PERSONA_TEMPLATE_ID;
const baseURL = process.env.PERSONA_URL;

export function getInquiry(inquiryId: string) {
  return request(GetInquiryResponse, `/inquiries/${inquiryId}`);
}

export function createInquiry(referenceId: string) {
  return request(CreateInquiryResponse, "/inquiries", {
    data: { attributes: { "inquiry-template-id": templateId, "redirect-uri": `${appOrigin}/card` } },
    meta: { "auto-create-account": true, "auto-create-account-reference-id": referenceId },
  });
}

export function generateOTL(inquiryId: string) {
  return request(GenerateOTLResponse, `/inquiries/${inquiryId}/generate-one-time-link`, undefined, "POST");
}

async function request<TInput, TOutput, TIssue extends BaseIssue<unknown>>(
  schema: BaseSchema<TInput, TOutput, TIssue>,
  url: `/${string}`,
  body?: unknown,
  method: "GET" | "POST" = body === undefined ? "GET" : "POST",
) {
  const response = await fetch(`${baseURL}${url}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: { accept: "application/json", authorization, "content-type": "application/json" },
    method,
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return parse(schema, await response.json());
}

const CreateInquiryResponse = object({
  data: object({
    attributes: object({ "reference-id": string(), status: literal("created") }),
    id: string(),
    type: literal("inquiry"),
  }),
});
const GetInquiryResponse = object({
  data: object({
    attributes: variant("status", [
      object({
        "email-address": string(),
        "name-first": string(),
        "name-last": string(),
        "name-middle": nullable(string()),
        "phone-number": string(),
        "reference-id": string(),
        status: picklist(["completed", "approved"]),
      }),
      object({
        "email-address": nullable(string()),
        "name-first": nullable(string()),
        "name-last": nullable(string()),
        "name-middle": nullable(string()),
        "phone-number": nullable(string()),
        "reference-id": string(),
        status: picklist(["created", "pending", "expired", "failed", "needs_review", "declined"]),
      }),
    ]),
    id: string(),
    type: literal("inquiry"),
  }),
});
const GenerateOTLResponse = object({
  data: object({
    attributes: object({ "reference-id": string(), status: string() }),
    id: string(),
    type: literal("inquiry"),
  }),
  meta: object({ "one-time-link": string(), "one-time-link-short": string() }),
});
