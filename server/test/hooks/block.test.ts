import "../mocks/alchemy";
import "../mocks/onesignal";
import "../mocks/redis";
import "../mocks/sentry";

import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";

import app from "../../hooks/block";

const appClient = testClient(app);

const blockPayload = {
  header: undefined,
  json: {
    type: "GRAPHQL" as const,
    event: {
      data: {
        block: {
          number: 666,
          timestamp: Math.floor(Date.now() / 1000),
          logs: [],
        },
      },
    },
  },
};

describe("validation", () => {
  it("accepts valid request", async () => {
    const response = await appClient.index.$post(blockPayload);

    expect(response.status).toBe(200);
  });
});
