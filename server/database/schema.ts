import { relations } from "drizzle-orm";
import { customType, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: string }>({ dataType: () => "bytea" });

export const credentials = pgTable("credentials", {
  id: text("id").primaryKey(),
  publicKey: bytea("public_key").notNull(),
  transports: text("transports").array(),
  counter: integer("counter").notNull(),
  kycId: text("kyc_id"),
});

export const cards = pgTable("cards", {
  id: text("id").primaryKey(),
  credentialId: text("credential_id")
    .references(() => credentials.id)
    .notNull(),
  lastFour: text("last_four").notNull(),
});

export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .references(() => cards.id)
    .notNull(),
  hash: text("hash").notNull(),
  payload: jsonb("payload").notNull(),
});

export const credentialsRelations = relations(credentials, ({ many }) => ({ cards: many(cards) }));

export const cardsRelations = relations(cards, ({ many, one }) => ({
  credential: one(credentials, { fields: [cards.credentialId], references: [credentials.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  card: one(cards, { fields: [transactions.cardId], references: [cards.id] }),
}));
