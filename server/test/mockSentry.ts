import type { Scope } from "@sentry/node";
import { beforeEach } from "node:test";
import { inspect } from "node:util";
import { vi } from "vitest";

const contexts = new Map<string, unknown>();

vi.mock("@sentry/node", async () => ({
  ...(await import("@sentry/node")),
  captureException: (...arguments_: unknown[]) => {
    for (const [key, value] of contexts) {
      console.log(key, inspect(value, false, null, true)); // eslint-disable-line unicorn/no-null, no-console -- must be null
    }
    console.log(...arguments_); // eslint-disable-line no-console
  },
  setContent: (key: string, value: unknown) => contexts.set(key, value),
  withScope: (callback: (scope: Scope) => void) => {
    callback(
      new Proxy({} as Scope, {
        get: (_, property) => {
          switch (property) {
            case "setContext":
              return (key: string, value: unknown) => contexts.set(key, value);
            default:
              return vi.fn();
          }
        },
      }),
    );
  },
}));

// eslint-disable-next-line @vitest/require-hook
beforeEach(() => {
  contexts.clear();
});
