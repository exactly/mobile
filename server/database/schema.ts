import { relations } from "drizzle-orm";
import { customType, integer, jsonb, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: string }>({ dataType: () => "bytea" });

export const cardStatus = pgEnum("card_status", ["ACTIVE", "FROZEN", "DELETED"]);

export const credentials = pgTable(
  "credentials",
  {
    account: text("account").notNull(),
    counter: integer("counter").notNull().default(0),
    factory: text("factory").notNull(),
    id: text("id").primaryKey(),
    kycId: text("kyc_id"),
    publicKey: bytea("public_key").notNull(),
    transports: text("transports").array(),
  },
  (table) => ({ accountIndex: uniqueIndex("account_index").on(table.account) }),
);

export const cards = pgTable("cards", {
  credentialId: text("credential_id")
    .references(() => credentials.id)
    .notNull(),
  id: text("id").primaryKey(),
  lastFour: text("last_four").notNull(),
  status: cardStatus("status").notNull().default("ACTIVE"),
});

export const transactions = pgTable("transactions", {
  cardId: text("card_id")
    .references(() => cards.id)
    .notNull(),
  hash: text("hash").notNull(),
  id: text("id").primaryKey(),
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
