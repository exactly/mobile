import "../mocks/auth";
import "../mocks/database";
import "../mocks/deployments";
import "../mocks/sentry";

import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { parse, type InferOutput } from "valibot";
import { zeroAddress, zeroHash, padHex, type Hash } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";

import app, { CreditActivity, DebitActivity, InstallmentsActivity } from "../../api/activity";
import database, { cards, credentials, transactions } from "../../database";
import { marketAbi } from "../../generated/contracts";
import deriveAddress from "../../utils/deriveAddress";
import anvilClient from "../anvilClient";

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
  const bob = privateKeyToAddress(padHex("0xb0b"));
  const account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(bob), y: zeroHash });
  const captureException = vi.spyOn(sentry, "captureException");

  beforeAll(async () => {
    await database
      .insert(credentials)
      .values([{ id: account, publicKey: new Uint8Array(), account, factory: zeroAddress }]);
  });

  afterEach(() => captureException.mockClear());

  describe("card", () => {
    let activity: InferOutput<typeof DebitActivity | typeof CreditActivity | typeof InstallmentsActivity>[];

    beforeAll(async () => {
      await database.insert(cards).values([{ id: "activity", credentialId: account, lastFour: "1234" }]);
      const logs = await anvilClient.getLogs({
        event: marketAbi[22],
        address: [inject("MarketEXA"), inject("MarketUSDC"), inject("MarketWETH")],
        args: { borrower: account },
        toBlock: "latest",
        fromBlock: 0n,
        strict: true,
      });
      const timestamps = await Promise.all(
        [...new Set(logs.map(({ blockNumber }) => blockNumber))].map((blockNumber) =>
          anvilClient.getBlock({ blockNumber }),
        ),
      ).then((blocks) => new Map(blocks.map(({ number, timestamp }) => [number, timestamp])));
      activity = await Promise.all(
        logs
          .reduce((map, { args, transactionHash, blockNumber }) => {
            const data = map.get(transactionHash);
            if (!data) return map.set(transactionHash, { blockNumber, events: [args] });
            data.events.push(args);
            return map;
          }, new Map<Hash, { blockNumber: bigint; events: (typeof logs)[number]["args"][] }>())
          .entries()
          .map(async ([hash, { blockNumber, events }], index) => {
            const blockTimestamp = timestamps.get(blockNumber)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
            const total = events.reduce((sum, { assets }) => sum + assets, 0n);
            const payload = {
              hash,
              operation_id: String(index),
              data: {
                created_at: new Date(Number(blockTimestamp) * 1000).toISOString(),
                bill_amount: Number(total) / 1e6,
                transaction_amount: (1200 * Number(total)) / 1e6,
                transaction_currency_code: "ARS",
                merchant_data: { name: "Merchant", country: "ARG", city: "Buenos Aires", state: "CABA" },
              },
            };
            await database.insert(transactions).values({ id: String(index), cardId: "activity", hash, payload });
            return parse({ 0: DebitActivity, 1: CreditActivity }[events.length] ?? InstallmentsActivity, {
              ...payload,
              events,
              blockTimestamp,
            });
          }),
      ).then((results) => results.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    });

    it("returns the card transaction", async () => {
      const response = await appClient.index.$get(
        { query: { include: "card" } },
        { headers: { "test-credential-id": account } },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual(activity);
    });

    it("reports bad transaction", async () => {
      await database.insert(transactions).values([{ id: "69", cardId: "activity", hash: "0x1", payload: {} }]);
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
      await expect(response.json()).resolves.toStrictEqual(activity);
    });
  });

  describe("onchain", () => {
    it("returns deposits", async () => {
      const response = await appClient.index.$get(
        { query: { include: "received" } },
        { headers: { "test-credential-id": account } },
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
        { headers: { "test-credential-id": account } },
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
        { headers: { "test-credential-id": account } },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject([
        { amount: 69, currency: "USDC", type: "sent", usdAmount: 69, receiver: padHex("0x69", { size: 20 }) },
      ]);
    });
  });
});
