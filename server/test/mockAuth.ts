import { createMiddleware } from "hono/factory";
import { vi } from "vitest";

vi.mock("../middleware/auth", () => ({
  default: createMiddleware(async (c, next) => {
    const credentialId = c.req.header("test-credential-id");
    if (!credentialId) return c.json("unauthorized", 401);
    c.set("credentialId", credentialId);
    await next();
  }),
}));
