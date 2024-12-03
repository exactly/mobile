import "../mocks/database";
import "../mocks/deployments";
import "../mocks/redis";
import "../mocks/sentry";

import { exaAccountFactoryAbi, exaPluginAbi } from "@exactly/common/generated/chain";
import * as sentry from "@sentry/node";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import { createHmac } from "node:crypto";
import {
  BaseError,
  ContractFunctionRevertedError,
  encodeErrorResult,
  encodeFunctionData,
  hexToBigInt,
  padHex,
  zeroAddress,
  zeroHash,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";

import database, { cards, credentials, transactions } from "../../database";
import { issuerCheckerAbi } from "../../generated/contracts";
import app from "../../hooks/panda";
import deriveAddress from "../../utils/deriveAddress";
import keeper from "../../utils/keeper";
import publicClient from "../../utils/publicClient";
import traceClient from "../../utils/traceClient";

const appClient = testClient(app);

const authorization = {
  header: { signature: "056e8b40cbffe5d26487267e00d82ef2d3331d7a6756f05a8effd86d562a02fa" },
  json: {
    resource: "transaction",
    action: "requested",
    body: {
      id: "31eaa81e-ffd9-4a2e-97eb-dccbc5f029d7",
      type: "spend",
      spend: {
        amount: 900,
        cardId: "543c1771-beae-4f26-b662-44ea48b40dc6",
        cardType: "virtual",
        currency: "usd",
        localAmount: 900,
        localCurrency: "usd",
        merchantName: "99999",
        merchantCity: "buenos aires",
        merchantCountry: "argentina",
        merchantCategory: "food",
        merchantCategoryCode: "FOOD",
        userId: "2cf0c886-f7c0-40f3-a8cd-3c4ab3997b66",
        userFirstName: "David",
        userLastName: "Mayer",
        userEmail: "mail@mail.com",
        status: "pending",
      },
    },
  },
} as const;

const receipt = {
  status: "success",
  blockHash: zeroHash,
  blockNumber: 0n,
  contractAddress: undefined,
  cumulativeGasUsed: 0n,
  effectiveGasPrice: 0n,
  from: zeroAddress,
  gasUsed: 0n,
  logs: [],
  logsBloom: "0x",
  to: null,
  transactionHash: "0x",
  transactionIndex: 0,
  type: "0x0",
} as const;

const callFrame = {
  type: "CALL",
  from: "",
  to: "",
  gas: "0x",
  gasUsed: "0x",
  input: "0x",
} as const;

function sign(json: string) {
  return createHmac("sha256", process.env.PANDA_WEBHOOK_KEY ?? "")
    .update(Buffer.from(json))
    .digest("hex");
}

async function collectorBalance() {
  return await publicClient
    .call({
      to: inject("USDC"),
      data: encodeFunctionData({
        abi: [
          {
            constant: true,
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            type: "function",
          },
        ],
        functionName: "balanceOf",
        args: [process.env.COLLECTOR_ADDRESS],
      }),
    })
    .then(({ data }) => {
      if (!data) throw new Error("No data");
      return hexToBigInt(data);
    });
}

const owner = privateKeyToAccount(generatePrivateKey());
const account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(owner.address), y: zeroHash });

beforeAll(async () => {
  await database
    .insert(credentials)
    .values([{ id: "cred", publicKey: new Uint8Array(), account, factory: zeroAddress }]);
  await database.insert(cards).values([{ id: "card", credentialId: "cred", lastFour: "1234" }]);
});

describe("validation", () => {
  it("fails with bad key", async () => {
    const response = await appClient.index.$post({ ...authorization, header: { signature: "bad" } });

    expect(response.status).toBe(401);
  });
});

describe("card operations", () => {
  beforeAll(async () => {
    await keeper.writeContract({
      address: inject("ExaAccountFactory"),
      abi: exaAccountFactoryAbi,
      functionName: "createAccount",
      args: [0n, [{ x: hexToBigInt(owner.address), y: 0n }]],
    });
  });

  describe("authorization", () => {
    describe("with collateral", () => {
      beforeAll(async () => {
        await keeper.writeContract({
          address: inject("USDC"),
          abi: [{ type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }] }],
          functionName: "mint",
          args: [account, 420e6],
        });
        await keeper.writeContract({
          address: account,
          abi: exaPluginAbi,
          functionName: "poke",
          args: [inject("MarketUSDC")],
        });
      });

      afterEach(() => vi.restoreAllMocks());

      it("authorizes credit", async () => {
        const json = {
          ...authorization.json,
          body: { ...authorization.json.body, spend: { ...authorization.json.body.spend, cardId: "card" } },
        };

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        expect(response.status).toBe(200);
      });

      it("authorizes debit", async () => {
        await database.insert(cards).values([{ id: "debit", credentialId: "cred", lastFour: "5678", mode: 0 }]);
        const json = {
          ...authorization.json,
          body: { ...authorization.json.body, spend: { ...authorization.json.body.spend, cardId: "debit" } },
        };

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        expect(response.status).toBe(200);
      });

      it("authorizes installments", async () => {
        await database.insert(cards).values([{ id: "inst", credentialId: "cred", lastFour: "5678", mode: 6 }]);
        const json = {
          ...authorization.json,
          body: { ...authorization.json.body, spend: { ...authorization.json.body.spend, cardId: "inst" } },
        };
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        expect(response.status).toBe(200);
      });

      it("authorizes zero", async () => {
        const json = {
          ...authorization.json,
          body: {
            ...authorization.json.body,
            spend: { ...authorization.json.body.spend, cardId: "card", amount: 0 },
          },
        };
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        expect(response.status).toBe(200);
      });

      it("fails when tracing", async () => {
        const captureException = vi.spyOn(sentry, "captureException");
        captureException.mockImplementation(() => "");

        const trace = vi.spyOn(traceClient, "traceCall").mockResolvedValue({ ...callFrame, output: "0x" });

        await database.insert(cards).values([{ id: "failed_trace", credentialId: "cred", lastFour: "2222", mode: 4 }]);

        const json = {
          ...authorization.json,
          body: { ...authorization.json.body, spend: { ...authorization.json.body.spend, cardId: "failed_trace" } },
        };
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        expect(trace).toHaveBeenCalledOnce();
        expect(captureException).toHaveBeenCalledWith(new Error("0x"), expect.anything());
        expect(response.status).toBe(400);
      });
    });
  });

  describe("clearing", () => {
    describe("with collateral", () => {
      beforeAll(async () => {
        await keeper.writeContract({
          address: inject("USDC"),
          abi: [{ type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }] }],
          functionName: "mint",
          args: [account, 420e6],
        });
        await keeper.writeContract({
          address: account,
          abi: exaPluginAbi,
          functionName: "poke",
          args: [inject("MarketUSDC")],
        });
      });

      afterEach(() => vi.restoreAllMocks());

      it("clears debit", async () => {
        const balance = await collectorBalance();

        const operation = "debits";
        const cardId = "debits";
        await database.insert(cards).values([{ id: "debits", credentialId: "cred", lastFour: "3456", mode: 0 }]);
        const json = {
          ...authorization.json,
          action: "created",
          body: {
            ...authorization.json.body,
            id: operation,
            spend: { ...authorization.json.body.spend, cardId },
          },
        } as const;
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });
        const card = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });
        await publicClient.waitForTransactionReceipt({ hash: card?.hash as Hex });

        await expect(collectorBalance()).resolves.toBe(
          balance + BigInt(Math.round(authorization.json.body.spend.amount * 1e4)),
        );
        expect(response.status).toBe(200);
      });

      it("clears credit", async () => {
        const balance = await collectorBalance();
        const amount = 10;

        const operation = "credits";
        const cardId = "credits";
        await database.insert(cards).values([{ id: "credits", credentialId: "cred", lastFour: "7890", mode: 1 }]);
        const json = {
          ...authorization.json,
          action: "created",
          body: {
            ...authorization.json.body,
            id: operation,
            spend: { ...authorization.json.body.spend, cardId, amount },
          },
        } as const;
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        const transaction = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });
        await publicClient.waitForTransactionReceipt({ hash: transaction?.hash as Hex });

        await expect(collectorBalance()).resolves.toBe(balance + BigInt(Math.round(amount * 1e4)));
        expect(response.status).toBe(200);
      });

      it("clears installments", async () => {
        const balance = await collectorBalance();
        const amount = 100;

        const operation = "splits";
        const cardId = "splits";
        await database.insert(cards).values([{ id: "splits", credentialId: "cred", lastFour: "6754", mode: 6 }]);

        const json = {
          ...authorization.json,
          action: "created",
          body: {
            ...authorization.json.body,
            id: operation,
            spend: { ...authorization.json.body.spend, cardId, amount },
          },
        } as const;

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        const transaction = await database.query.transactions.findFirst({
          where: eq(transactions.id, operation),
        });
        await publicClient.waitForTransactionReceipt({ hash: transaction?.hash as Hex });

        await expect(collectorBalance()).resolves.toBe(balance + BigInt(Math.round(amount * 1e4)));
        expect(response.status).toBe(200);
      });

      it("handles duplicated clearing", async () => {
        const captureException = vi.spyOn(sentry, "captureException");
        captureException.mockImplementation(() => "");

        vi.spyOn(publicClient, "simulateContract").mockRejectedValue(
          new BaseError("Error", {
            cause: new ContractFunctionRevertedError({
              abi: issuerCheckerAbi,
              functionName: "collectInstallments",
              data: encodeErrorResult({ errorName: "Expired", abi: issuerCheckerAbi }),
            }),
          }),
        );

        const getTransactionReceipt = vi
          .spyOn(publicClient, "getTransactionReceipt")
          .mockResolvedValue({ ...receipt, logs: [] });

        const amount = 50;

        const operation = "dupe";
        const cardId = "dupe";
        await database.insert(cards).values([{ id: cardId, credentialId: "cred", lastFour: "7777", mode: 6 }]);
        await database.insert(transactions).values([{ id: operation, cardId, hash: zeroHash, payload: {} }]);
        const json = {
          ...authorization.json,
          action: "created",
          body: {
            ...authorization.json.body,
            id: operation,
            spend: { ...authorization.json.body.spend, cardId, amount },
          },
        } as const;
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        expect(captureException).not.toHaveBeenCalled();
        expect(getTransactionReceipt).toHaveBeenCalledOnce();
        expect(response.status).toBe(200);
      });

      it("fails with transaction timeout", async () => {
        const captureException = vi.spyOn(sentry, "captureException");
        captureException.mockImplementation(() => "");

        vi.spyOn(publicClient, "waitForTransactionReceipt").mockRejectedValue(new Error("Transaction Timeout"));

        const operation = "timeout";
        const cardId = "timeout";
        await database.insert(cards).values([{ id: cardId, credentialId: "cred", lastFour: "7777", mode: 6 }]);
        const json = {
          ...authorization.json,
          action: "created",
          body: {
            ...authorization.json.body,
            id: operation,
            spend: { ...authorization.json.body.spend, cardId, amount: 60 },
          },
        } as const;
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        const transaction = await database.query.transactions.findFirst({
          where: eq(transactions.id, operation),
        });

        expect(captureException).toHaveBeenCalledWith(new Error("Transaction Timeout"));
        expect(transaction).toBeTruthy();
        expect(response.status).toBe(200);
      });

      it("fails with transaction revert", async () => {
        const captureException = vi.spyOn(sentry, "captureException");
        captureException.mockImplementation(() => "");

        vi.spyOn(publicClient, "waitForTransactionReceipt").mockResolvedValue({
          ...receipt,
          status: "reverted",
          logs: [],
        });

        const operation = "revert";
        const cardId = "revert";
        await database.insert(cards).values([{ id: cardId, credentialId: "cred", lastFour: "8888", mode: 5 }]);
        const json = {
          ...authorization.json,
          action: "created",
          body: {
            ...authorization.json.body,
            id: operation,
            spend: { ...authorization.json.body.spend, cardId, amount: 70 },
          },
        } as const;
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        const transaction = await database.query.transactions.findFirst({
          where: eq(transactions.id, operation),
        });

        expect(captureException).toHaveBeenCalledWith(new Error("tx reverted"), expect.anything());
        expect(transaction).toBeTruthy();
        expect(response.status).toBe(200);
      });

      it("fails with unexpected error", async () => {
        const captureException = vi.spyOn(sentry, "captureException");
        captureException.mockImplementation(() => "");

        vi.spyOn(publicClient, "simulateContract").mockRejectedValue(new Error("Unexpected Error"));

        const operation = "unexpected";
        const cardId = "unexpected";
        await database.insert(cards).values([{ id: cardId, credentialId: "cred", lastFour: "8888", mode: 4 }]);
        const json = {
          ...authorization.json,
          action: "created",
          body: {
            ...authorization.json.body,
            id: operation,
            spend: { ...authorization.json.body.spend, cardId, amount: 90 },
          },
        } as const;
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: sign(JSON.stringify(json)) },
          json,
        });

        expect(captureException).toHaveBeenCalledWith(new Error("Unexpected Error"), expect.anything());
        expect(response.status).toBe(569);
      });
    });
  });
});
