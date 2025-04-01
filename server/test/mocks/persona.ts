import { vValidator } from "@hono/valibot-validator";
import { object, string } from "valibot";
import { vi } from "vitest";

vi.mock("../../utils/persona", async (importOriginal) => ({
  ...(await importOriginal()),
  headerValidator: () => vValidator("header", object({ "persona-signature": string() }), (r, c) => undefined),
}));
