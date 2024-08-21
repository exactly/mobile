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
    if (!credential.kycId) {
      const { kycId, result } = await (inquiryId
        ? getInquiry(inquiryId).then(({ data }) => {
            return { kycId: inquiryId, result: data.attributes.status === "approved" };
          })
        : createInquiry().then(async ({ data }) => {
            const { meta } = await generateOTL(data.id);
            return { kycId: data.id, result: meta["one-time-link"] };
          }));
      if (!kycId) return c.text("kyc not found", 404);
      if (!result) return c.text("kyc not approved", 403);
      await database.update(credentials).set({ kycId }).where(eq(credentials.id, credentialId));
      return c.json(result);
    }
  },
);

export default app;
