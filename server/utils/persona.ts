import {
  array,
  type BaseIssue,
  type BaseSchema,
  literal,
  nullable,
  object,
  parse,
  picklist,
  string,
  variant,
} from "valibot";

import appOrigin from "./appOrigin";

if (!process.env.PERSONA_API_KEY) throw new Error("missing persona api key");
if (!process.env.PERSONA_TEMPLATE_ID) throw new Error("missing persona template id");
if (!process.env.PERSONA_URL) throw new Error("missing persona url");

const authorization = `Bearer ${process.env.PERSONA_API_KEY}`;
const templateId = process.env.PERSONA_TEMPLATE_ID;
const baseURL = process.env.PERSONA_URL;

export async function getInquiry(referenceId: string) {
  const { data: approvedInquiries } = await request(
    GetInquiriesResponse,
    `/inquiries?page[size]=1filter[reference-id]=${referenceId}&filter[status]=approved`,
  );
  if (approvedInquiries[0]) return approvedInquiries[0];
  const { data: inquiries } = await request(
    GetInquiriesResponse,
    `/inquiries?page[size]=1&filter[reference-id]=${referenceId}`,
  );
  return inquiries[0];
}

export function resumeInquiry(inquiryId: string) {
  return request(ResumeInquiryResponse, `/inquiries/${inquiryId}/resume`, undefined, "POST");
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
    method,
    headers: { authorization, accept: "application/json", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return parse(schema, await response.json());
}

const GetInquiriesResponse = object({
  data: array(
    object({
      id: string(),
      type: literal("inquiry"),
      attributes: variant("status", [
        object({
          status: picklist(["completed", "approved"]),
          "reference-id": string(),
          "name-first": string(),
          "name-middle": nullable(string()),
          "name-last": string(),
          "email-address": string(),
          "phone-number": string(),
        }),
        object({
          status: picklist(["created", "pending", "expired", "failed", "needs_review", "declined"]),
          "reference-id": string(),
          "name-first": nullable(string()),
          "name-middle": nullable(string()),
          "name-last": nullable(string()),
          "email-address": nullable(string()),
          "phone-number": nullable(string()),
        }),
      ]),
    }),
  ),
});
const ResumeInquiryResponse = object({
  data: object({
    id: string(),
    type: literal("inquiry"),
    attributes: object({
      status: picklist([
        "created",
        "pending",
        "expired",
        "failed",
        "needs_review",
        "declined",
        "completed",
        "approved",
      ]),
      "reference-id": string(),
      fields: object({
        "name-first": object({ type: literal("string"), value: nullable(string()) }),
        "name-middle": object({ type: literal("string"), value: nullable(string()) }),
        "name-last": object({ type: literal("string"), value: nullable(string()) }),
        "email-address": object({ type: literal("string"), value: nullable(string()) }),
        "phone-number": object({ type: literal("string"), value: nullable(string()) }),
      }),
    }),
  }),
  meta: object({ "session-token": string() }),
});
const CreateInquiryResponse = object({
  data: object({
    id: string(),
    type: literal("inquiry"),
    attributes: object({ status: literal("created"), "reference-id": string() }),
  }),
});
const GenerateOTLResponse = object({
  data: object({
    id: string(),
    type: literal("inquiry"),
    attributes: object({ status: string(), "reference-id": string() }),
  }),
  meta: object({ "one-time-link": string(), "one-time-link-short": string() }),
});
