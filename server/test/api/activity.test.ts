import "../mockDatabase";
import "../mockDeployments";
import "../mockSentry";

import * as sentry from "@sentry/node";
import { createMiddleware } from "hono/factory";
import { testClient } from "hono/testing";
import { parse, type InferInput } from "valibot";
import { zeroAddress } from "viem";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { beforeAll, describe, expect, it, vi } from "vitest";

import app, { CardTransaction } from "../../api/activity";
import database, { cards, credentials, transactions } from "../../database";

vi.mock("../../middleware/auth", () => ({
  default: createMiddleware(async (c, next) => {
    const credentialId = c.req.header("test-credential-id");
    if (credentialId) c.set("credentialId", credentialId);
    await next();
  }),
}));

const appClient = testClient(app);

describe("validation", () => {
  beforeAll(async () => {
    await database
      .insert(credentials)
      .values([{ id: "cred", publicKey: new Uint8Array(), account: zeroAddress, factory: zeroAddress }]);
  });

  it("fails with no auth", async () => {
    const response = await appClient.index.$get();

    expect(response.status).toBe(401);
  });

  it("fails with bad credential", async () => {
    const response = await appClient.index.$get(undefined, { headers: { "test-credential-id": "bad" } });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toBe("credential not found");
  });

  it("succeeds with valid credential", async () => {
    const response = await appClient.index.$get(
      { query: { include: "card" } },
      { headers: { "test-credential-id": "cred" } },
    );

    expect(response.status).toBe(200);
  });
});

describe("card", () => {
  const account = privateKeyToAddress(generatePrivateKey());
  const payload: InferInput<typeof CardTransaction> = {
    operation_id: "0",
    data: {
      created_at: new Date().toISOString(),
      bill_amount: 100 / 3,
      transaction_amount: (1111.11 * 100) / 3,
      transaction_currency_code: "ARS",
      merchant_data: { name: "Merchant", country: "ARG", city: "Buenos Aires", state: "CABA" },
    },
  };

  beforeAll(async () => {
    await database
      .insert(credentials)
      .values([{ id: account, publicKey: new Uint8Array(), account, factory: zeroAddress }]);
    await database.insert(cards).values([{ id: "card", credentialId: account, lastFour: "1234" }]);
    await database.insert(transactions).values([{ id: "0", cardId: "card", hash: "0x0", payload }]);
  });

  it("returns the card transaction", async () => {
    const response = await appClient.index.$get(
      { query: { include: "card" } },
      { headers: { "test-credential-id": account } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual([parse(CardTransaction, payload)]);
  });

  it("reports bad transaction", async () => {
    await database.insert(transactions).values([{ id: "1", cardId: "card", hash: "0x1", payload: {} }]);

    const captureException = vi.spyOn(sentry, "captureException").mockImplementationOnce(() => "");

    const response = await appClient.index.$get(
      { query: { include: "card" } },
      { headers: { "test-credential-id": account } },
    );

    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(new Error("bad transaction"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual([parse(CardTransaction, payload)]);
  });
});
