import { Address } from "@exactly/common/validation";
import { setUser } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { parse } from "valibot";

import database, { credentials } from "../database";
import auth from "../middleware/auth";
import decodePublicKey from "../utils/decodePublicKey";

const app = new Hono();
app.use(auth);

export default app.get("/", async (c) => {
  const credentialId = c.get("credentialId");
  const credential = await database.query.credentials.findFirst({
    where: eq(credentials.id, credentialId),
    columns: { publicKey: true, account: true, factory: true },
  });
  if (!credential) return c.text("credential not found", 401);
  setUser({ id: parse(Address, credential.account) });
  return c.json({ credentialId, factory: credential.factory, ...decodePublicKey(credential.publicKey) });
});
