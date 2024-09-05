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
  if (!credential) return c.json("credential not found", 404);
  if (!credential.kycId) return c.json("kyc not found", 404);
  const { data } = await getInquiry(credential.kycId);
  if (data.attributes.status !== "approved") return c.json("kyc not approved", 403);
  return c.json(true);
});

app.post(
  "/",
  vValidator("json", object({ inquiryId: optional(string()) }), ({ success }, c) => {
    if (!success) return c.json("invalid body", 400);
  }),
  async (c) => {
    const credentialId = c.get("credentialId");
    const credential = await database.query.credentials.findFirst({
      columns: { id: true, kycId: true },
      where: eq(credentials.id, credentialId),
    });
    if (!credential) return c.json("credential not found", 404);
    const { inquiryId } = c.req.valid("json");
    if (inquiryId) {
      const { data } = await getInquiry(inquiryId);
      if (data.attributes["reference-id"] !== credentialId) return c.json("unauthorized", 403);
      if (data.attributes.status === "completed" || data.attributes.status === "approved") {
        await database.update(credentials).set({ kycId: data.id }).where(eq(credentials.id, credentialId));
        return c.json(true);
      }
      return c.json("kyc not approved", 403);
    }
    if (credential.kycId) {
      const { data } = await getInquiry(credential.kycId);
      if (data.attributes["reference-id"] !== credentialId) return c.json("unauthorized", 403);
      switch (data.attributes.status) {
        case "created": {
          const { meta } = await generateOTL(credential.kycId);
          return c.json(meta["one-time-link"]);
        }
        case "expired": {
          const { data: inquiry } = await createInquiry(credentialId);
          const { meta } = await generateOTL(inquiry.id);
          return c.json(meta["one-time-link"]);
        }
        case "approved":
          return c.json(true);
        default:
          return c.json("kyc not approved", 403);
      }
    }
    const { data } = await createInquiry(credentialId); // TODO check for existing persona inquiries
    const { meta } = await generateOTL(data.id);
    await database.update(credentials).set({ kycId: data.id }).where(eq(credentials.id, credentialId));
    return c.json(meta["one-time-link"]);
  },
);

export default app;
