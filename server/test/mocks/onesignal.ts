import { vi } from "vitest";

vi.mock("../../utils/onesignal", async () => ({
  ...(await import("../../utils/onesignal")),
  sendPushNotification: () => Promise.resolve({}),
}));
