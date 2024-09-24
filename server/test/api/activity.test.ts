import "../mockAuth";
import "../mockDatabase";
import "../mockDeployments";
import "../mockSentry";

import { Address } from "@exactly/common/types";
import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { parse, type InferInput } from "valibot";
import { zeroAddress, zeroHash } from "viem";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";

import app, { AssetReceivedActivity, AssetSentActivity, CardActivity } from "../../api/activity";
import database, { cards, credentials, transactions } from "../../database";
import publicClient, { AssetTransfer } from "../../utils/publicClient";

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

  beforeAll(async () => {
    await database
      .insert(credentials)
      .values([{ id: account, publicKey: new Uint8Array(), account, factory: zeroAddress }]);
  });

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

      const captureException = vi.spyOn(sentry, "captureException").mockImplementationOnce(() => "");

      const response = await appClient.index.$get(
        { query: { include: "card" } },
        { headers: { "test-credential-id": account } },
      );

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(new Error("bad transaction"));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual([parse(CardActivity, payload)]);
    });
  });

  describe("asset transfers", () => {
    const baseTransfer = {
      hash: zeroHash,
      blockNum: "0x0",
      uniqueId: "0x0:log:0",
      metadata: { blockTimestamp: new Date().toISOString() },
      category: "erc20",
      asset: "USDC",
      value: 1,
      rawContract: { address: inject("USDC"), value: "0xf4240", decimal: "0x6" },
    } as const;
    const market = { decimals: 6, symbol: "exaUSDC", usdPrice: 10n ** 18n } as const;
    const getAssetTransfers = vi.spyOn(publicClient, "getAssetTransfers");

    afterEach(() => getAssetTransfers.mockClear());

    it("returns the received transfers", async () => {
      const transfer = parse(AssetTransfer, { ...baseTransfer, to: account, from: zeroAddress });
      getAssetTransfers.mockResolvedValueOnce({ transfers: [transfer] });
      const response = await appClient.index.$get(
        { query: { include: "received" } },
        { headers: { "test-credential-id": account } },
      );

      expect(getAssetTransfers).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual([parse(AssetReceivedActivity, { ...transfer, market })]);
    });

    it("returns the sent transfers", async () => {
      const transfer = parse(AssetTransfer, { ...baseTransfer, from: account, to: zeroAddress });
      getAssetTransfers.mockResolvedValueOnce({ transfers: [transfer] });
      const response = await appClient.index.$get(
        { query: { include: "sent" } },
        { headers: { "test-credential-id": account } },
      );

      expect(getAssetTransfers).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual([parse(AssetSentActivity, { ...transfer, market })]);
    });

    it("reports bad transfer", async () => {
      const transfer = parse(AssetTransfer, { ...baseTransfer, from: account, to: zeroAddress });
      getAssetTransfers.mockResolvedValueOnce({ transfers: [transfer, baseTransfer as any] }); // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      const captureException = vi.spyOn(sentry, "captureException").mockImplementationOnce(() => "");
      const response = await appClient.index.$get(
        { query: { include: "received" } },
        { headers: { "test-credential-id": account } },
      );

      expect(getAssetTransfers).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(new Error("bad transfer"));
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual([parse(AssetReceivedActivity, { ...transfer, market })]);
    });
  });
});