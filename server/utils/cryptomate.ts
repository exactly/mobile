import { Address } from "@exactly/common/validation";
import * as v from "valibot";

if (!process.env.CRYPTOMATE_URL || !process.env.CRYPTOMATE_API_KEY) throw new Error("missing cryptomate vars");
const baseURL = process.env.CRYPTOMATE_URL;
const apiKey = process.env.CRYPTOMATE_API_KEY;

export function createCard({
  account,
  cardholder,
  email,
  phone,
  limits,
}: {
  account: Address;
  cardholder: string;
  email: string;
  phone: { countryCode: string; number: string };
  limits: { daily: number; weekly: number; monthly: number };
}) {
  return request(
    CreateCardResponse,
    "/cards/virtual-cards/create",
    v.parse(CreateCardRequest, {
      card_holder_name: cardholder,
      email,
      phone_country_code: phone.countryCode,
      phone: phone.number,
      approval_method: "DEFI",
      daily_limit: limits.daily,
      weekly_limit: limits.weekly,
      monthly_limit: limits.monthly,
      metadata: { account },
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
    method,
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${String(response.status)} ${await response.text()}`);
  return v.parse(schema, await response.json());
}

const CreateCardRequest = v.object({
  card_holder_name: v.string(),
  email: v.pipe(v.string(), v.email()),
  phone_country_code: v.pipe(v.string(), v.regex(/^\d{2}$/)),
  phone: v.pipe(v.string(), v.regex(/^\d+$/)),
  approval_method: v.literal("DEFI"),
  daily_limit: v.number(),
  weekly_limit: v.number(),
  monthly_limit: v.number(),
  metadata: v.object({ account: Address }),
});

const CreateCardResponse = v.object({
  id: v.string(),
  card_holder_name: v.string(),
  type: v.literal("Virtual"),
  last4: v.pipe(v.string(), v.regex(/^\d{4}$/)),
  status: v.literal("ACTIVE"),
  daily_limit: v.number(),
  weekly_limit: v.number(),
  monthly_limit: v.number(),
});

const PANResponse = v.object({ url: v.pipe(v.string(), v.url()) });
