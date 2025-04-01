import { validator } from "hono/validator";
import { vi } from "vitest";

vi.mock("../../utils/alchemy", async (importOriginal) => ({
  ...(await importOriginal()),
  headerValidator: () => validator("header", () => undefined),
}));
