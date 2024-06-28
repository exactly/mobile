import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as v from "valibot";

// import client from "../utils/chainClient.js";

export default function handler({ method, body, headers }: VercelRequest, response: VercelResponse) {
  if (method !== "POST") return response.status(405).end("method not allowed");

  const payload = v.safeParse(Payload, body || placeholderPayload);
  console.dir(payload, { depth: null }); // eslint-disable-line no-console, unicorn/no-null
  if (!payload.success) return response.status(400).json(payload); // HACK for debugging

  // const { amount } = payload.output.data;

  // console.log(await client.simulateContract({}));

  return response.json({ response_code: "69" });
}

const Payload = v.variant("event_type", [
  v.object({
    event_type: v.literal("AUTHORIZATION"),
    status: v.literal("PENDING"),
    product: v.literal("CARDS"),
    operation_id: v.nullable(v.string()),
    data: v.object({
      card_id: v.string(),
      amount: v.number(),
      currency_number: v.literal(840),
      currency_code: v.literal("USD"),
      exchange_rate: v.null(),
      channel: v.picklist(["ECOMMERCE", "POS", "ATM", "Visa Direct"]),
      created_at: v.nullable(v.pipe(v.string(), v.isoTimestamp())),
      fees: v.object({ atm_fees: v.nullable(v.number()), fx_fees: v.nullable(v.number()) }),
      merchant_data: v.object({
        id: v.nullable(v.string()),
        name: v.nullable(v.string()),
        city: v.nullable(v.string()),
        post_code: v.nullable(v.string()),
        state: v.nullable(v.string()),
        country: v.nullable(v.pipe(v.string(), v.length(3))),
        mcc_category: v.string(),
        mcc_code: v.string(),
      }),
    }),
  }),
]);
type Payload = v.InferOutput<typeof Payload>; // eslint-disable-line @typescript-eslint/no-redeclare

/* eslint-disable unicorn/no-null */
const placeholderPayload = {
  product: "CARDS",
  event_type: "AUTHORIZATION",
  operation_id: null,
  status: "PENDING",
  data: {
    card_id: "111fdf0f-9521-403e-a53d-874319243df1",
    amount: 1,
    currency_number: 840,
    currency_code: "USD",
    exchange_rate: null,
    channel: "ECOMMERCE",
    created_at: null,
    fees: { atm_fees: null, fx_fees: null },
    merchant_data: {
      id: null,
      name: null,
      city: null,
      post_code: null,
      state: null,
      country: null,
      mcc_category: "Fast Food Restaurants",
      mcc_code: "5814",
    },
  },
};
/* eslint-enable unicorn/no-null */
