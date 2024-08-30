import { vValidator } from "@hono/valibot-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { object, optional, string } from "valibot";

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

app.post(
  "/",
  vValidator("json", object({ inquiryId: optional(string()) }), ({ success }, c) => {
    if (!success) return c.text("invalid body", 400);
  }),
  async (c) => {
    const credentialId = c.get("credentialId");
    const credential = await database.query.credentials.findFirst({
      columns: { id: true, kycId: true },
      where: eq(credentials.id, credentialId),
    });
    if (!credential) return c.text("credential not found", 404);
    const { inquiryId } = c.req.valid("json");
    if (inquiryId) {
      const { data } = await getInquiry(inquiryId);
      if (data.attributes["reference-id"] !== credentialId) return c.text("unauthorized", 403);
      if (data.attributes.status === "completed" || data.attributes.status === "approved") {
        await database.update(credentials).set({ kycId: data.id }).where(eq(credentials.id, credentialId));
        return c.json(true);
      }
      return c.text("kyc not approved", 403);
    }
    if (credential.kycId) {
      const { data } = await getInquiry(credential.kycId);
      if (data.attributes["reference-id"] !== credentialId) return c.text("unauthorized", 403);
      if (data.attributes.status === "expired") {
        const { data: inquiry } = await createInquiry(credentialId);
        const { meta } = await generateOTL(inquiry.id);
        return c.body(meta["one-time-link"]);
      }
      if (data.attributes.status !== "approved") return c.text("kyc not approved", 403);
      return c.json(true);
    }
    const { data } = await createInquiry(credentialId);
    const { meta } = await generateOTL(data.id);
    await database.update(credentials).set({ kycId: data.id }).where(eq(credentials.id, credentialId));
    return c.body(meta["one-time-link"]);
  },
);

export default app;
