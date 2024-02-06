import { jsonb, pgEnum, pgTable, text, numeric } from "drizzle-orm/pg-core";

import { CARD_STATUS, OPERATION_COUNTRIES, USER_STATUS } from "../utils/types.js";

export const userStatusEnum = pgEnum("status", USER_STATUS);
export const countryEnum = pgEnum("operation_country", OPERATION_COUNTRIES);
export const cardStatusEnum = pgEnum("status", CARD_STATUS);
export const transactionStatusEnum = pgEnum("transaction_status", ["APPROVED", "REJECTED"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  client_id: text("client_id"),
  email: text("email"),
  status: userStatusEnum("status"),
  operation_country: countryEnum("operation_country"),
  name: text("name"),
  surname: text("surname"),
  payload: jsonb("payload").notNull(),
});

export const card = pgTable("cards", {
  id: text("id").primaryKey(),
  user_id: text("user_id")
    .references(() => users.id)
    .notNull(),
  affinity_group_id: text("affinity_group_id").notNull(),
  status: cardStatusEnum("status").notNull(),
  last_four: text("last_four"),
  payload: jsonb("payload").notNull(),
});

export const transaction = pgTable("transactions", {
  id: text("id").primaryKey(),
  card_id: text("card_id")
    .references(() => card.id)
    .notNull(),
  user_id: text("user_id")
    .references(() => users.id)
    .notNull(),
  settlement_amount: numeric("settlement_amount").notNull(),
  txHash: text("txHash"),
  transaction_status: transactionStatusEnum("transaction_status").notNull(),
  payload: jsonb("payload").notNull(),
});

export const credential = pgTable("credentials", {
  credentialID: text("credentialID").notNull(),
  transports: text("transports").array(),
  credentialPublicKey: text("credentialPublicKey").notNull(),
  counter: numeric("counter").notNull(),
});

export const challenge = pgTable("challenge", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
});
