import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as v from "valibot";

export default function handler({ method, body, headers }: VercelRequest, response: VercelResponse) {
  if (method !== "POST") return response.status(405).end("method not allowed");

  const payload = v.safeParse(Payload, body);
  if (!payload.success) return response.status(400).json(payload); // HACK for debugging

  return response.json({ response_code: "69" });
}

const Payload = v.variant("event_type", [
  v.object({
    event_type: v.literal("AUTHORIZATION"),
    status: v.literal("PENDING"),
    product: v.literal("CARDS"),
    operation_id: v.string(),
    data: v.object({
      card_id: v.string(),
      amount: v.number(),
      currency_number: v.literal(840),
      currency_code: v.literal("USD"),
      exchange_rate: v.null(),
      channel: v.picklist(["ECOMMERCE", "POS", "ATM", "Visa Direct"]),
      created_at: v.pipe(v.string(), v.isoTimestamp()),
      fees: v.object({ atm_fees: v.number(), fx_fees: v.number() }),
      merchant_data: v.object({
        id: v.string(),
        name: v.string(),
        city: v.string(),
        post_code: v.nullable(v.string()),
        state: v.nullable(v.string()),
        country: v.string(),
        mcc_category: v.string(),
        mcc_code: v.string(),
      }),
    }),
  }),
]);
type Payload = v.InferOutput<typeof Payload>; // eslint-disable-line @typescript-eslint/no-redeclare
