import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { nullable, number, object, safeParse, string, isoTimestamp, pipe } from "valibot";

import database, { cards } from "../database";
import auth from "../middleware/auth";

const app = new Hono();

app.use("*", auth);

app.get("/", async (c) => {
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
            const { success, output } = safeParse(Transaction, payload);
            if (!success) return;
            const { operation_id, data } = output;
            return {
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
            };
          })
          .filter(Boolean),
      )
      .reverse(),
  );
});

export default app;

const Transaction = object({
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
});
