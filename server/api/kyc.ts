import { Address } from "@exactly/common/validation";
import { setUser } from "@sentry/node";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { parse } from "valibot";

import database, { credentials } from "../database/index";
import auth from "../middleware/auth";
import { createInquiry, generateOTL, getInquiry, resumeInquiry } from "../utils/persona";

const app = new Hono();
app.use(auth);

export default app
  .get("/", async (c) => {
    const credentialId = c.get("credentialId");
    const credential = await database.query.credentials.findFirst({
      columns: { id: true, account: true },
      where: eq(credentials.id, credentialId),
    });
    if (!credential) return c.json("credential not found", 404);
    setUser({ id: parse(Address, credential.account) });
    const inquiry = await getInquiry(credentialId);
    if (!inquiry) return c.json("kyc not found", 404);
    if (inquiry.attributes.status === "created") return c.json("kyc not started", 400);
    if (inquiry.attributes.status === "pending" || inquiry.attributes.status === "expired") {
      const { meta } = await resumeInquiry(inquiry.id);
      const result = { inquiryId: inquiry.id, sessionToken: meta["session-token"] };
      return c.json(result, 200);
    }
    if (inquiry.attributes.status !== "approved") return c.json("kyc not approved", 400);
    return c.json("ok", 200);
  })
  .post("/", async (c) => {
    const credentialId = c.get("credentialId");
    const credential = await database.query.credentials.findFirst({
      columns: { id: true, account: true },
      where: eq(credentials.id, credentialId),
    });
    if (!credential) return c.json("credential not found", 404);
    setUser({ id: parse(Address, credential.account) });
    const inquiry = await getInquiry(credentialId);
    if (inquiry) {
      if (inquiry.attributes.status === "approved") return c.json("kyc already approved", 400);
      if (inquiry.attributes.status === "created" || inquiry.attributes.status === "expired") {
        const { meta } = await generateOTL(inquiry.id);
        return c.json(meta["one-time-link"]);
      }
      return c.json("kyc failed", 400);
    }
    const { data } = await createInquiry(credentialId);
    const { meta } = await generateOTL(data.id);
    return c.json(meta["one-time-link"]);
  });
