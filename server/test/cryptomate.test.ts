import { testClient } from "hono/testing";
import Redis from "ioredis-mock";
import { zeroAddress } from "viem";
import { describe, expect, it, vi } from "vitest";

import app from "../hooks/cryptomate";

vi.mock("ioredis", () => ({ Redis }));

const client = testClient(app);

const authorization = {
  header: { "x-webhook-key": "cryptomate" },
  json: {
    event_type: "AUTHORIZATION",
    status: "PENDING",
    product: "CARDS",
    operation_id: "op",
    data: {
      bill_currency_code: "USD",
      bill_currency_number: 840,
      bill_amount: 0.01,
      card_id: "card",
      created_at: "2021-01-01T00:00:00Z",
      metadata: { account: zeroAddress },
      signature: "0x",
    },
  },
} as const;

describe("validation", () => {
  it("fails with bad key", async () => {
    expect.assertions(1);

    const response = await client.index.$post({ ...authorization, header: { "x-webhook-key": "bad" } });

    expect(response.status).toBe(401);
  });

  it("accepts valid request", async () => {
    expect.assertions(1);

    const response = await client.index.$post(authorization);

    expect(response.status).toBe(200);
  });
});
