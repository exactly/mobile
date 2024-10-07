import { validator } from "hono/validator";
import { vi } from "vitest";

vi.mock("../utils/alchemy", async () => ({
  ...(await import("../utils/alchemy")),
  headerValidator(signingKey: string) {
    return validator("header", () => undefined);
  },
}));
