import "../mockAuth";
import "../mockDatabase";
import "../mockDeployments";
import "../mockSentry";

import { Address } from "@exactly/common/validation";
import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { type InferInput, parse } from "valibot";
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
      .values([{ account: zeroAddress, factory: zeroAddress, id: "cred", publicKey: new Uint8Array() }]);
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
      .values([{ account, factory: zeroAddress, id: account, publicKey: new Uint8Array() }]);
  });

  afterEach(() => captureException.mockClear());

  describe("card", () => {
    const payload: InferInput<typeof CardActivity> = {
      data: {
        bill_amount: 100 / 3,
        created_at: new Date().toISOString(),
        merchant_data: { city: "Buenos Aires", country: "ARG", name: "Merchant", state: "CABA" },
        transaction_amount: (1111.11 * 100) / 3,
        transaction_currency_code: "ARS",
      },
      operation_id: "0",
    };

    beforeAll(async () => {
      await database.insert(cards).values([{ credentialId: account, id: "card", lastFour: "1234" }]);
      await database.insert(transactions).values([{ cardId: "card", hash: "0x0", id: "0", payload }]);
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
      await database.insert(transactions).values([{ cardId: "card", hash: "0x1", id: "1", payload: {} }]);
      captureException.mockImplementationOnce(() => "");
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
      asset: "USDC",
      blockNum: "0x0",
      category: "erc20",
      hash: zeroHash,
      metadata: { blockTimestamp: new Date().toISOString() },
      rawContract: { address: inject("USDC"), decimal: "0x6", value: "0xf4240" },
      uniqueId: "0x0:log:0",
      value: 1,
    } as const;
    const market = { decimals: 6, symbol: "exaUSDC", usdPrice: 10n ** 18n } as const;
    const getAssetTransfers = vi.spyOn(publicClient, "getAssetTransfers");

    afterEach(() => getAssetTransfers.mockClear());

    it("returns the received transfers", async () => {
      const transfer = parse(AssetTransfer, { ...baseTransfer, from: zeroAddress, to: account });
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

    it("works with eth transfer", async () => {
      const transfer = parse(AssetTransfer, { ...baseTransfer, from: zeroAddress, to: account });
      getAssetTransfers.mockResolvedValueOnce({
        transfers: [
          transfer,
          parse(AssetTransfer, {
            asset: "ETH",
            blockNum: "0x0",
            category: "external",
            from: zeroAddress,
            hash: zeroHash,
            metadata: { blockTimestamp: new Date().toISOString() },
            rawContract: { address: null, decimal: "0x12", value: "0xde0b6b3a7640000" },
            to: account,
            uniqueId: "0x0:external",
            value: 1,
          }),
        ],
      });
      const response = await appClient.index.$get(
        { query: { include: "received" } },
        { headers: { "test-credential-id": account } },
      );

      expect(getAssetTransfers).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledTimes(0);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual([parse(AssetReceivedActivity, { ...transfer, market })]);
    });

    it("ignores market transfers", async () => {
      const transfer = parse(AssetTransfer, { ...baseTransfer, from: zeroAddress, to: account });
      getAssetTransfers.mockResolvedValueOnce({
        transfers: [transfer, parse(AssetTransfer, { ...baseTransfer, from: inject("MarketUSDC"), to: account })],
      });
      getAssetTransfers.mockResolvedValueOnce({
        transfers: [parse(AssetTransfer, { ...baseTransfer, from: account, to: inject("MarketUSDC") })],
      });
      const response = await appClient.index.$get(
        { query: { include: ["received", "sent"] } },
        { headers: { "test-credential-id": account } },
      );

      expect(getAssetTransfers).toHaveBeenCalledTimes(2);
      expect(captureException).toHaveBeenCalledTimes(0);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual([parse(AssetReceivedActivity, { ...transfer, market })]);
    });

    it("ignores unknown asset", async () => {
      const transfer = parse(AssetTransfer, { ...baseTransfer, from: zeroAddress, to: account });
      getAssetTransfers.mockResolvedValueOnce({
        transfers: [
          transfer,
          parse(AssetTransfer, {
            ...baseTransfer,
            from: zeroAddress,
            rawContract: { ...baseTransfer.rawContract, address: zeroAddress },
            to: account,
          }),
        ],
      });
      const response = await appClient.index.$get(
        { query: { include: "received" } },
        { headers: { "test-credential-id": account } },
      );

      expect(getAssetTransfers).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledTimes(0);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual([parse(AssetReceivedActivity, { ...transfer, market })]);
    });

    it("reports bad transfer", async () => {
      const transfer = parse(AssetTransfer, { ...baseTransfer, from: zeroAddress, to: account });
      getAssetTransfers.mockResolvedValueOnce({ transfers: [transfer, { ...baseTransfer, from: zeroAddress } as any] }); // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      captureException.mockImplementationOnce(() => "");
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
