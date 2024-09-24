import { vi } from "vitest";

vi.mock("@sentry/node", async () => ({
  ...(await import("@sentry/node")),
  captureException: console.error, // eslint-disable-line no-console
}));
