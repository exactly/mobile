import { vValidator } from "@hono/valibot-validator";
import { object, string } from "valibot";
import { vi } from "vitest";

vi.mock("../../utils/panda", async (importOriginal) => ({
  ...(await importOriginal()),
  headerValidator: () => {
    return vValidator("header", object({ signature: string() }), (r, c) => {
      if (!r.success) return c.text("bad request", 400);
      return r.output.signature === "bad" ? c.text("unauthorized", 401) : undefined;
    });
  },
}));
