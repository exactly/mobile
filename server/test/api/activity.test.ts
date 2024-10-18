import "../mocks/auth";
import "../mocks/database";
import "../mocks/deployments";
import "../mocks/sentry";

import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { parse, type InferInput } from "valibot";
import { zeroAddress, zeroHash, padHex, createPublicClient, http } from "viem";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";

import app, { AssetReceivedActivity, AssetSentActivity, CardActivity } from "../../api/activity";
import database, { cards, credentials, transactions } from "../../database";
import deriveAddress from "../../utils/deriveAddress";
import publicClient, { AssetTransfer } from "../../utils/publicClient";

const appClient = testClient(app);

function closeTo(expected: number, precision = 2) {
  return {
    asymmetricMatch(actual: number) {
      return Math.abs(expected - actual) < Math.pow(10, -precision) / 2;
    },
    toString() {
      return `Number close to ${expected} (±${Math.pow(10, -precision) / 2})`;
    },
  };
}

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

    it("works with eth transfer", async () => {
      const transfer = parse(AssetTransfer, { ...baseTransfer, to: account, from: zeroAddress });
      getAssetTransfers.mockResolvedValueOnce({
        transfers: [
          transfer,
          parse(AssetTransfer, {
            to: account,
            from: zeroAddress,
            hash: zeroHash,
            blockNum: "0x0",
            category: "external",
            uniqueId: "0x0:external",
            metadata: { blockTimestamp: new Date().toISOString() },
            asset: "ETH",
            value: 1,
            rawContract: { address: null, value: "0xde0b6b3a7640000", decimal: "0x12" },
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
      const transfer = parse(AssetTransfer, { ...baseTransfer, to: account, from: zeroAddress });
      getAssetTransfers.mockResolvedValueOnce({
        transfers: [transfer, parse(AssetTransfer, { ...baseTransfer, to: account, from: inject("MarketUSDC") })],
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
      const transfer = parse(AssetTransfer, { ...baseTransfer, to: account, from: zeroAddress });
      getAssetTransfers.mockResolvedValueOnce({
        transfers: [
          transfer,
          parse(AssetTransfer, {
            ...baseTransfer,
            to: account,
            from: zeroAddress,
            rawContract: { ...baseTransfer.rawContract, address: zeroAddress },
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
      const transfer = parse(AssetTransfer, { ...baseTransfer, to: account, from: zeroAddress });
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

  describe("asset repay", () => {
    const bob = privateKeyToAddress(padHex("0xb0b"));
    const bobAccount = deriveAddress(inject("ExaAccountFactory"), { x: padHex(bob), y: zeroHash });

    beforeAll(async () => {
      await database
        .insert(credentials)
        .values([{ id: bobAccount, publicKey: new Uint8Array(), account: bobAccount, factory: zeroAddress }]);
    });

    it("returns repays", async () => {
      const response = await appClient.index.$get(
        { query: { include: "repay" } },
        { headers: { "test-credential-id": bobAccount } },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject([
        {
          amount: closeTo(81, 1),
          type: "repay",
          symbol: "USDC",
          usdAmount: closeTo(81, 1),
        },
      ]);
    });

    it("returns withdraw", async () => {
      const response = await appClient.index.$get(
        { query: { include: "withdraw" } },
        { headers: { "test-credential-id": bobAccount } },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject([
        {
          amount: closeTo(69, 1),
          symbol: "USDC",
          type: "withdraw",
          usdAmount: closeTo(69, 1),
          receiver: "0x0000000000000000000000000000000000000069",
        },
      ]);
    });

    it("batch get block requests", async () => {
      let requests = 0;
      const client = createPublicClient({
        chain,
        cacheTime: 60_000,
        transport: http(`${chain.rpcUrls.alchemy?.http[0]}/${alchemyAPIKey}`, {
          batch: true,
          onFetchRequest(request) {
            requests++;
          },
        }),
      });

      let time = Date.now();
      await client.getBlock({ blockNumber: 1n });
      console.log(`1 block  ${Date.now() - time}ms number of requests: ${requests}`); // eslint-disable-line no-console

      time = Date.now();
      await Promise.all(Array.from({ length: 3 }, (_, index) => client.getBlock({ blockNumber: BigInt(index + 2) })));
      console.log(`3 blocks  ${Date.now() - time}ms number of requests: ${requests}`); // eslint-disable-line no-console

      expect(requests).toBe(2);
    });
  });
});
