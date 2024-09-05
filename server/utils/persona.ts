import { type BaseIssue, type BaseSchema, literal, nullable, object, parse, string } from "valibot";

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
    data: {
      attributes: {
        "inquiry-template-id": templateId,
        "redirect-uri": appOrigin,
      },
    },
    meta: {
      "auto-create-account": true,
      "auto-create-account-reference-id": referenceId,
    },
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
  if (!response.ok) throw new Error(`${String(response.status)} ${await response.text()}`);
  return parse(schema, await response.json());
}
const InquiryData = object({ id: string(), type: literal("inquiry") });

const CreateInquiryResponse = object({ data: InquiryData });

const GetInquiryResponse = object({
  data: object({
    id: string(),
    type: literal("inquiry"),
    attributes: object({
      status: string(),
      "reference-id": nullable(string()),
      "name-first": string(),
      "name-middle": nullable(string()),
      "name-last": string(),
      "email-address": string(),
      "phone-number": string(),
    }),
  }),
});

const GenerateOTLResponse = object({
  data: InquiryData,
  meta: object({ "one-time-link": string(), "one-time-link-short": string() }),
});
