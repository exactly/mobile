import { inspect } from "node:util";
import { beforeEach, vi } from "vitest";

const contexts = new Map<string, unknown>();

vi.mock("@sentry/node", async (importOriginal) => ({
  ...(await importOriginal()),
  captureException(exception: unknown, hint?: { level?: string; contexts?: Record<string, unknown> }) {
    const { contexts: localContexts, ...rest } = hint ?? {};
    if (localContexts) for (const [key, value] of Object.entries(localContexts)) contexts.set(key, value);
    for (const [key, value] of contexts) {
      console.log(key, inspect(value, false, null, true)); // eslint-disable-line no-console
    }
    for (const [key, value] of Object.entries(rest)) console.log(key, inspect(value, false, null, true)); // eslint-disable-line no-console
    console.log(exception instanceof Error ? exception.stack : exception); // eslint-disable-line no-console
  },
  setContext: (key: string, value: unknown) => contexts.set(key, value),
}));

beforeEach(() => {
  contexts.clear();
});
