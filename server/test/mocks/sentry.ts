import { close, getSpanStatusFromHttpCode, startSpan } from "@sentry/node";
import type * as hono from "hono";
import { createMiddleware } from "hono/factory";
import path from "node:path";
import { afterAll, beforeEach, expect, vi } from "vitest";

const contexts = new Map<string, unknown>();

vi.mock("hono", async (importOriginal) => {
  await import("../../instrument.cjs");
  const { Hono, ...original } = await importOriginal<typeof hono>();
  return {
    ...original,
    Hono: class extends Hono {
      constructor(...arguments_: ConstructorParameters<typeof Hono>) {
        super(...arguments_);
        this.use(middleware);
      }
    },
  };
});

const middleware = createMiddleware(async (c, next) => {
  const testFile = path.relative(path.resolve(__dirname, ".."), expect.getState().testPath ?? ""); // eslint-disable-line unicorn/prefer-module
  const name = `${c.req.method} /${testFile.replace(/\.test\.ts$/, "")}`;
  return startSpan({ name, op: "http.server", forceTransaction: true }, async (span) => {
    await next();
    span.setStatus(getSpanStatusFromHttpCode(c.res.status));
  });
});

beforeEach(() => {
  contexts.clear();
});

afterAll(() => close());
