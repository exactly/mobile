import { relations } from "drizzle-orm";
import { customType, integer, pgTable, text } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; default: false }>({ dataType: () => "bytea" });

export const credentials = pgTable("credentials", {
  id: text("id").primaryKey(),
  publicKey: bytea("public_key").notNull(),
  transports: text("transports").array(),
  counter: integer("counter").notNull(),
});

export const cards = pgTable("cards", {
  id: text("id").primaryKey(),
  credentialId: text("credential_id")
    .references(() => credentials.id)
    .notNull(),
  lastFour: text("last_four").notNull(),
});

export const credentialsRelations = relations(credentials, ({ many }) => ({ cards: many(cards) }));

export const cardsRelations = relations(cards, ({ one }) => ({
  credential: one(credentials, { fields: [cards.credentialId], references: [credentials.id] }),
}));
