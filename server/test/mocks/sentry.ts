import { beforeEach } from "node:test";
import { inspect } from "node:util";
import { vi } from "vitest";

const contexts = new Map<string, unknown>();

vi.mock("@sentry/node", async () => ({
  ...(await import("@sentry/node")),
  captureException(...arguments_: unknown[]) {
    for (const [key, value] of contexts) {
      console.log(key, inspect(value, false, null, true)); // eslint-disable-line no-console
    }
    console.log(...arguments_); // eslint-disable-line no-console
  },
  setContext: (key: string, value: unknown) => contexts.set(key, value),
}));

// eslint-disable-next-line @vitest/require-hook
beforeEach(() => {
  contexts.clear();
});
