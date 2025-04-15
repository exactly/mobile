import { close, getSpanStatusFromHttpCode, startSpan } from "@sentry/node";
import type * as hono from "hono";
import { createMiddleware } from "hono/factory";
import path from "node:path";
import { afterAll, expect, vi } from "vitest";

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
  const { currentTestName, testPath } = expect.getState();
  const testFile = path.relative(path.resolve(__dirname, ".."), testPath ?? ""); // eslint-disable-line unicorn/prefer-module
  const name = `${c.req.method} /${testFile.replace(/\.test\.ts$/, "")}`;
  return startSpan(
    { name, op: "http.server", forceTransaction: true, attributes: { "test.name": currentTestName } },
    async (span) => {
      await next();
      span.setStatus(getSpanStatusFromHttpCode(c.res.status));
    },
  );
});

afterAll(() => close());
