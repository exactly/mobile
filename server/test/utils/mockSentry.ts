import { vi } from "vitest";

vi.mock("@sentry/node", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@sentry/node")>()), // eslint-disable-line @typescript-eslint/consistent-type-imports
  captureException: console.error, // eslint-disable-line no-console
}));
