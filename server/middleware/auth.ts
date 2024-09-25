import { getSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

import authSecret from "../utils/authSecret";

export default createMiddleware(async (c, next) => {
  const credentialId = await getSignedCookie(c, authSecret, "credential_id");
  if (!credentialId) return c.json("unauthorized", 401);
  c.set("credentialId", credentialId);
  await next();
});
