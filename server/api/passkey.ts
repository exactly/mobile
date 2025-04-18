import { Address } from "@exactly/common/validation";
import { setUser } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { parse } from "valibot";

import database, { credentials } from "../database";
import auth from "../middleware/auth";
import decodePublicKey from "../utils/decodePublicKey";

export default new Hono().use(auth).get("/", async (c) => {
  const credentialId = c.get("credentialId");
  const credential = await database.query.credentials.findFirst({
    where: eq(credentials.id, credentialId),
    columns: { publicKey: true, account: true, factory: true },
  });
  if (!credential) return c.json("credential not found", 401);
  setUser({ id: parse(Address, credential.account) });
  return c.json({ credentialId, factory: credential.factory, ...decodePublicKey(credential.publicKey) }, 200);
});
