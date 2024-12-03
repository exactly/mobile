import { vValidator } from "@hono/valibot-validator";
import { object, string } from "valibot";
import { vi } from "vitest";

vi.mock("../../utils/persona", async () => ({
  ...(await import("../../utils/persona")),
  headerValidator: () => vValidator("header", object({ "persona-signature": string() }), (r, c) => undefined),
}));
