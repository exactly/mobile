import { captureException, withScope } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { type InferOutput, nullable, number, object, safeParse, string, isoTimestamp, pipe, transform } from "valibot";

import database, { cards } from "../database";
import auth from "../middleware/auth";

const app = new Hono();
app.use(auth);

export default app.get("/", async (c) => {
  const credentialId = c.get("credentialId");
  const userCards = await database.query.cards.findMany({
    where: eq(cards.credentialId, credentialId),
    with: { transactions: { columns: { payload: true } } },
  });
  if (userCards.length === 0) return c.json("no cards found", 401);
  return c.json(
    userCards
      .flatMap(({ transactions }) =>
        transactions
          .map(({ payload }) => {
            const result = safeParse(Transaction, payload);
            if (result.success) return result.output;
            withScope((scope) => {
              scope.setLevel("error");
              scope.setContext("validation", result);
              captureException(new Error("bad transaction"));
            });
          })
          .filter(Boolean),
      )
      .reverse() as InferOutput<typeof Transaction>[],
  );
});

const Transaction = pipe(
  object({
    operation_id: string(),
    data: object({
      created_at: pipe(string(), isoTimestamp()),
      bill_amount: number(),
      merchant_data: object({
        name: string(),
        country: nullable(string()),
        state: nullable(string()),
        city: nullable(string()),
      }),
      transaction_amount: number(),
      transaction_currency_code: nullable(string()),
    }),
  }),
  transform(({ operation_id, data }) => ({
    id: operation_id,
    amount: data.transaction_amount,
    currency: data.transaction_currency_code,
    merchant: {
      name: data.merchant_data.name,
      city: data.merchant_data.city,
      country: data.merchant_data.country,
      state: data.merchant_data.state,
    },
    timestamp: data.created_at,
    usdAmount: data.bill_amount,
  })),
);
