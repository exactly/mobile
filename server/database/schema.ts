import { customType, integer, jsonb, numeric, pgEnum, pgTable, text } from "drizzle-orm/pg-core";

import { CARD_STATUS, OPERATION_COUNTRIES, USER_STATUS } from "../utils/types.js";

export const userStatusEnum = pgEnum("status", USER_STATUS);
export const countryEnum = pgEnum("operation_country", OPERATION_COUNTRIES);
export const cardStatusEnum = pgEnum("status", CARD_STATUS);
export const transactionStatusEnum = pgEnum("transaction_status", ["APPROVED", "REJECTED"]);

const bytea = customType<{ data: Uint8Array; default: false }>({ dataType: () => "bytea" });

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  clientId: text("client_id"),
  email: text("email"),
  status: userStatusEnum("status"),
  operationCountry: countryEnum("operation_country"),
  name: text("name"),
  surname: text("surname"),
  payload: jsonb("payload").notNull(),
});

export const card = pgTable("cards", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  affinityGroupId: text("affinity_group_id").notNull(),
  status: cardStatusEnum("status").notNull(),
  lastFour: text("last_four"),
  payload: jsonb("payload").notNull(),
});

export const transaction = pgTable("transactions", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .references(() => card.id)
    .notNull(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  settlementAmount: numeric("settlement_amount").notNull(),
  txHash: text("tx_hash"),
  status: transactionStatusEnum("status").notNull(),
  payload: jsonb("payload").notNull(),
});

export const credential = pgTable("credentials", {
  id: text("id").primaryKey(),
  publicKey: bytea("public_key").notNull(),
  transports: text("transports").array(),
  counter: integer("counter").notNull(),
});
