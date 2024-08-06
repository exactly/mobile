import { CreateCardParameters } from "@exactly/common/types";
import { vValidator } from "@hono/valibot-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import database, { cards, credentials } from "../database";
import auth from "../middleware/auth";
import { createCard, getPAN } from "../utils/cryptomate";

const app = new Hono();

app.use("*", auth);

app.get("/", async (c) => {
  const credentialId = c.get("credentialId");
  const card = await database.query.cards.findFirst({
    columns: { id: true },
    where: eq(cards.credentialId, credentialId),
  });
  if (!card) return c.text("card not found", 404);
  return c.json(await getPAN(card.id));
});

app.post(
  "/",
  vValidator("json", CreateCardParameters, ({ success, issues }, c) => {
    if (!success) return c.json(issues, 400);
  }),
  async (c) => {
    const credentialId = c.get("credentialId");
    const credential = await database.query.credentials.findFirst({
      columns: { kyc: true },
      where: eq(credentials.id, credentialId),
    });
    if (!credential) return c.text("credential not found", 404);
    if (!credential.kyc) return c.text("kyc required", 403);
    const card = await createCard(c.req.valid("json"));
    await database.insert(cards).values([{ id: card.id, lastFour: card.last4, credentialId }]);
    return c.json(card);
  },
);

export default app;
