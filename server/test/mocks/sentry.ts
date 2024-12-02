import { inspect } from "node:util";
import { beforeEach, vi } from "vitest";

const contexts = new Map<string, unknown>();

vi.mock("@sentry/node", async () => ({
  ...(await import("@sentry/node")),
  captureException(...arguments_: unknown[]) {
    for (const [key, value] of contexts) {
      console.log(key, inspect(value, false, null, true)); // eslint-disable-line no-console
    }
    console.log(...arguments_.map((value) => inspect(value, false, null, true))); // eslint-disable-line no-console
  },
  setContext: (key: string, value: unknown) => contexts.set(key, value),
}));

beforeEach(() => {
  contexts.clear();
});
