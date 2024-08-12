import { eq } from "drizzle-orm";
import { Hono } from "hono";

import database, { credentials } from "../database/index";
import auth from "../middleware/auth";
import { createInquiry, generateOTL, getInquiry } from "../utils/persona";

const app = new Hono();

app.use("*", auth);

app.get("/", async (c) => {
  const credentialId = c.get("credentialId");
  const credential = await database.query.credentials.findFirst({
    columns: { id: true, kycId: true },
    where: eq(credentials.id, credentialId),
  });
  if (!credential) return c.text("credential not found", 404);
  if (!credential.kycId) return c.text("kyc not found", 404);
  const { data } = await getInquiry(credential.kycId);
  if (data.attributes.status !== "approved") return c.json("kyc not approved", 403);
  return c.json(true);
});

app.post("/", async (c) => {
  const credentialId = c.get("credentialId");
  const credential = await database.query.credentials.findFirst({
    columns: { id: true, kycId: true },
    where: eq(credentials.id, credentialId),
  });
  if (!credential) return c.text("credential not found", 404);
  let inquiryId = credential.kycId;
  if (!inquiryId) {
    const { data } = await createInquiry();
    await database.update(credentials).set({ kycId: data.id }).where(eq(credentials.id, credentialId));
    inquiryId = data.id;
  }
  const { meta } = await generateOTL(inquiryId);
  return c.json(meta["one-time-link"]);
});

export default app;
