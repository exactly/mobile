import "../mocks/auth";
import "../mocks/database";
import "../mocks/deployments";
import "../mocks/sentry";

import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { safeParse, type InferOutput } from "valibot";
import { zeroHash, padHex, type Hash, ContractFunctionExecutionError, BaseError, zeroAddress } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";

import app, { CreditActivity, DebitActivity, InstallmentsActivity, PandaActivity } from "../../api/activity";
import database, { cards, credentials, transactions } from "../../database";
import { marketAbi, previewerAbi } from "../../generated/contracts";
import deriveAddress from "../../utils/deriveAddress";
import publicClient from "../../utils/publicClient";
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
  const readContract = vi.spyOn(publicClient, "readContract");

  beforeAll(async () => {
    await database
      .insert(credentials)
      .values([{ id: account, publicKey: new Uint8Array(), account, factory: zeroAddress }]);
  });

  afterEach(() => {
    captureException.mockClear();
    readContract.mockClear();
  });

  describe("card", () => {
    let activity: InferOutput<
      typeof DebitActivity | typeof CreditActivity | typeof InstallmentsActivity | typeof PandaActivity
    >[];

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
            const payload =
              index % 2 === 0
                ? {
                    bodies: [
                      {
                        body: {
                          id: String(index),
                          type: "spend",
                          spend: {
                            amount: Number(total) / 1e4,
                            cardId: "ea4dd7e7-0774-431f-9871-5e4da9322505",
                            status: "pending",
                            userId: "f5eb6ea9-e9ba-4e2f-b16a-94a99f32385c",
                            cardType: "virtual",
                            currency: "usd",
                            userEmail: "nic@exact.ly",
                            localAmount: (1200 * Number(total)) / 1e4,
                            merchantCity: "Buenos Aires",
                            merchantName: "once",
                            userLastName: "SAMPLEapproved",
                            localCurrency: "ARS",
                            userFirstName: "ALEXANDER J",
                            merchantCountry: "ARG",
                            authorizedAmount: 11,
                            merchantCategory: "once - once",
                            authorizationMethod: "Normal presentment",
                            merchantCategoryCode: "once",
                          },
                        },
                        action: "created",
                        resource: "transaction",
                        createdAt: new Date(Number(blockTimestamp) * 1000).toISOString(),
                      },
                    ],
                    merchant: {
                      name: "Apple Store",
                      city: "Buenos Aires",
                      country: "Argentina",
                    },
                    type: "panda",
                  }
                : {
                    operation_id: String(index),
                    type: "cryptomate",
                    data: {
                      created_at: new Date(Number(blockTimestamp) * 1000).toISOString(),
                      bill_amount: Number(total) / 1e6,
                      transaction_amount: (1200 * Number(total)) / 1e6,
                      transaction_currency_code: "ARS",
                      merchant_data: { name: "Merchant", country: "ARG", city: "Buenos Aires", state: "BA" },
                    },
                  };
            await database
              .insert(transactions)
              .values({ id: String(index), cardId: "activity", hashes: [hash], payload });

            const panda = safeParse(PandaActivity, {
              ...(payload as object),
              hashes: [hash],
              borrows: [{ blockNumber, events }],
            });
            if (panda.success) return panda.output;

            const cryptomate = safeParse(
              { 0: DebitActivity, 1: CreditActivity }[events.length] ?? InstallmentsActivity,
              {
                ...(payload as object),
                hash,
                events,
                blockTimestamp,
              },
            );
            if (cryptomate.success) return cryptomate.output;
            throw new Error("bad test setup");
          }),
      ).then((results) => results.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    });

    it("retries exactly when error and returns the card transaction", async () => {
      readContract.mockRejectedValueOnce(
        new ContractFunctionExecutionError(new BaseError("Error"), {
          abi: previewerAbi,
          functionName: "exactly",
          args: [zeroAddress],
        }),
      );

      const response = await appClient.index.$get(
        { query: { include: "card" } },
        { headers: { "test-credential-id": account } },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual(activity);
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
      await database.insert(transactions).values([{ id: "69", cardId: "activity", hashes: ["0x1"], payload: {} }]);
      captureException.mockImplementationOnce(() => "");
      const response = await appClient.index.$get(
        { query: { include: "card" } },
        { headers: { "test-credential-id": account } },
      );

      expect(captureException).toHaveBeenCalledOnce();
      expect(captureException).toHaveBeenCalledWith(
        new Error("bad transaction"),
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          contexts: expect.objectContaining({
            cryptomate: expect.objectContaining({ issues: expect.anything() }), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
            panda: expect.objectContaining({ issues: expect.anything() }), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          }),
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
        {
          amount: expect.closeTo(419.5, 0.01), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
          currency: "USDC",
          type: "repay",
          usdAmount: expect.closeTo(419.5, 0.01), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
        },
        { amount: expect.closeTo(81, 0.5), currency: "USDC", type: "repay", usdAmount: expect.closeTo(81, 0.5) }, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
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
