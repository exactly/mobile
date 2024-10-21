import "../mocks/auth";
import "../mocks/database";
import "../mocks/deployments";
import "../mocks/sentry";

import { Address } from "@exactly/common/validation";
import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { parse, type InferInput } from "valibot";
import { zeroAddress, zeroHash, padHex } from "viem";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";

import app, { CardActivity } from "../../api/activity";
import database, { cards, credentials, transactions } from "../../database";
import deriveAddress from "../../utils/deriveAddress";

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
    await expect(response.json()).resolves.toBe("unauthorized");
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

describe("authenticated", () => {
  const account = parse(Address, privateKeyToAddress(generatePrivateKey()));
  const captureException = vi.spyOn(sentry, "captureException");

  beforeAll(async () => {
    await database
      .insert(credentials)
      .values([{ id: account, publicKey: new Uint8Array(), account, factory: zeroAddress }]);
  });

  afterEach(() => captureException.mockClear());

  describe("card", () => {
    const payload: InferInput<typeof CardActivity> = {
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
      await database.insert(cards).values([{ id: "card", credentialId: account, lastFour: "1234" }]);
      await database.insert(transactions).values([{ id: "0", cardId: "card", hash: "0x0", payload }]);
    });

    it("returns the card transaction", async () => {
      const response = await appClient.index.$get(
        { query: { include: "card" } },
        { headers: { "test-credential-id": account } },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual([parse(CardActivity, payload)]);
    });

    it("reports bad transaction", async () => {
      await database.insert(transactions).values([{ id: "1", cardId: "card", hash: "0x1", payload: {} }]);
      captureException.mockImplementationOnce(() => "");
      const response = await appClient.index.$get(
        { query: { include: "card" } },
        { headers: { "test-credential-id": account } },
      );

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        new Error("bad transaction"),
        expect.objectContaining({
          contexts: expect.objectContaining({ validation: expect.objectContaining({ issues: expect.anything() }) }), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
        }),
      );
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual([parse(CardActivity, payload)]);
    });
  });

  describe("onchain", () => {
    const bob = privateKeyToAddress(padHex("0xb0b"));
    const bobAccount = deriveAddress(inject("ExaAccountFactory"), { x: padHex(bob), y: zeroHash });

    beforeAll(async () => {
      await database
        .insert(credentials)
        .values([{ id: bobAccount, publicKey: new Uint8Array(), account: bobAccount, factory: zeroAddress }]);
    });

    it("returns deposits", async () => {
      const response = await appClient.index.$get(
        { query: { include: "received" } },
        { headers: { "test-credential-id": bobAccount } },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject([
        { type: "received", currency: "WETH", amount: 1, usdAmount: 2500 },
        { type: "received", currency: "USDC", amount: 69_420, usdAmount: 69_420 },
        { type: "received", currency: "EXA", amount: 666, usdAmount: 3330 },
      ]);
    });

    it("returns repays", async () => {
      const response = await appClient.index.$get(
        { query: { include: "repay" } },
        { headers: { "test-credential-id": bobAccount } },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject([
        { amount: expect.closeTo(433, 1), currency: "USDC", type: "repay", usdAmount: expect.closeTo(433, 1) }, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
        { amount: expect.closeTo(81, 1), currency: "USDC", type: "repay", usdAmount: expect.closeTo(81, 1) }, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
      ]);
    });

    it("returns withdraws", async () => {
      const response = await appClient.index.$get(
        { query: { include: "sent" } },
        { headers: { "test-credential-id": bobAccount } },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject([
        { amount: 69, currency: "USDC", type: "sent", usdAmount: 69, receiver: padHex("0x69", { size: 20 }) },
      ]);
    });
  });
});
