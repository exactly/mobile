import { Address } from "@exactly/common/validation";
import * as v from "valibot";

if (!process.env.CRYPTOMATE_URL || !process.env.CRYPTOMATE_API_KEY) throw new Error("missing cryptomate vars");
const baseURL = process.env.CRYPTOMATE_URL;
const apiKey = process.env.CRYPTOMATE_API_KEY;

export function createCard({
  account,
  cardholder,
  email,
  limits,
  phone,
}: {
  account: Address;
  cardholder: string;
  email: string;
  limits: { daily: number; monthly: number; weekly: number };
  phone: { countryCode: string; number: string };
}) {
  return request(
    CreateCardResponse,
    "/cards/virtual-cards/create",
    v.parse(CreateCardRequest, {
      approval_method: "DEFI",
      card_holder_name: cardholder,
      daily_limit: limits.daily,
      email,
      metadata: { account },
      monthly_limit: limits.monthly,
      phone: phone.number,
      phone_country_code: phone.countryCode,
      weekly_limit: limits.weekly,
    }),
  );
}

export async function getPAN(cardId: string) {
  const { url } = await request(PANResponse, `/cards/virtual-cards/${cardId}/pan-html`);
  return url;
}

async function request<TInput, TOutput, TIssue extends v.BaseIssue<unknown>>(
  schema: v.BaseSchema<TInput, TOutput, TIssue>,
  url: `/${string}`,
  body?: unknown,
  method: "GET" | "POST" = body === undefined ? "GET" : "POST",
) {
  const response = await fetch(`${baseURL}${url}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    method,
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return v.parse(schema, await response.json());
}

const CreateCardRequest = v.object({
  approval_method: v.literal("DEFI"),
  card_holder_name: v.string(),
  daily_limit: v.number(),
  email: v.pipe(v.string(), v.email()),
  metadata: v.object({ account: Address }),
  monthly_limit: v.number(),
  phone: v.pipe(v.string(), v.regex(/^\d+$/)),
  phone_country_code: v.pipe(v.string(), v.regex(/^\d{1,4}$/)),
  weekly_limit: v.number(),
});

const CreateCardResponse = v.object({
  card_holder_name: v.string(),
  daily_limit: v.number(),
  id: v.string(),
  last4: v.pipe(v.string(), v.regex(/^\d{4}$/)),
  monthly_limit: v.number(),
  status: v.literal("ACTIVE"),
  type: v.literal("Virtual"),
  weekly_limit: v.number(),
});

const PANResponse = v.object({ url: v.pipe(v.string(), v.url()) });
