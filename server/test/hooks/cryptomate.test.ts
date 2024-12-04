import "../mocks/database";
import "../mocks/deployments";
import "../mocks/onesignal";
import "../mocks/redis";
import "../mocks/sentry";

import { exaAccountFactoryAbi, exaPluginAbi } from "@exactly/common/generated/chain";
import * as sentry from "@sentry/node";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
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
import app from "../../hooks/cryptomate";
import deriveAddress from "../../utils/deriveAddress";
import keeper from "../../utils/keeper";
import publicClient from "../../utils/publicClient";
import traceClient from "../../utils/traceClient";

const appClient = testClient(app);

const authorization = {
  header: { "x-webhook-key": "cryptomate" },
  json: {
    product: "CARDS",
    event_type: "AUTHORIZATION",
    operation_id: "op",
    status: "PENDING",
    data: {
      card_id: "card",
      bill_amount: 45.23,
      bill_currency_number: "840",
      bill_currency_code: "USD",
      exchange_rate: 1,
      transaction_amount: 45.23,
      transaction_currency_number: "840",
      transaction_currency_code: "USD",
      channel: "ECOMMERCE",
      created_at: new Date().toISOString(),
      fees: { atm_fees: 0, fx_fees: 0 },
      merchant_data: {
        id: "420429000207212",
        name: "GetYourGuideOperations",
        city: "185-5648235",
        post_code: "1990",
        state: "DE",
        country: "USA",
        mcc_category: "Tourist Attractions and Exhibits",
        mcc_code: "7991",
      },
      metadata: { account: zeroAddress },
      signature: "0x",
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
    const response = await appClient.index.$post({ ...authorization, header: { "x-webhook-key": "bad" } });

    expect(response.status).toBe(401);
  });

  it("accepts valid request", async () => {
    vi.spyOn(sentry, "captureException").mockImplementationOnce(() => "");
    const response = await appClient.index.$post(authorization);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ response_code: "51" });
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
        const response = await appClient.index.$post({
          ...authorization,
          json: { ...authorization.json, data: { ...authorization.json.data, metadata: { account } } },
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toStrictEqual({ response_code: "00" });
      });

      it("authorizes debit", async () => {
        await database.insert(cards).values([{ id: "debit", credentialId: "cred", lastFour: "5678", mode: 0 }]);
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            data: { ...authorization.json.data, card_id: "debit", metadata: { account } },
          },
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toStrictEqual({ response_code: "00" });
      });

      it("authorizes installments", async () => {
        await database.insert(cards).values([{ id: "inst", credentialId: "cred", lastFour: "5678", mode: 6 }]);
        const response = await appClient.index.$post({
          ...authorization,
          json: { ...authorization.json, data: { ...authorization.json.data, card_id: "inst", metadata: { account } } },
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toStrictEqual({ response_code: "00" });
      });

      it("authorizes zero", async () => {
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            data: { ...authorization.json.data, bill_amount: 0, metadata: { account } },
          },
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toStrictEqual({ response_code: "00" });
      });

      it("fails when tracing", async () => {
        const captureException = vi.spyOn(sentry, "captureException");
        captureException.mockImplementation(() => "");

        const trace = vi.spyOn(traceClient, "traceCall").mockResolvedValue({ ...callFrame, output: "0x" });

        await database.insert(cards).values([{ id: "failed_trace", credentialId: "cred", lastFour: "2222", mode: 4 }]);
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            data: { ...authorization.json.data, card_id: "failed_trace", metadata: { account } },
          },
        });

        expect(trace).toHaveBeenCalledOnce();
        expect(captureException).toHaveBeenCalledWith(new Error("0x"), expect.anything());
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toStrictEqual({ response_code: "69" });
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
        await database.insert(cards).values([{ id: "debits", credentialId: "cred", lastFour: "3456", mode: 0 }]);
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            event_type: "CLEARING",
            operation_id: operation,
            data: { ...authorization.json.data, card_id: "debits", metadata: { account } },
          },
        });
        const card = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });
        await publicClient.waitForTransactionReceipt({ hash: card?.hash as Hex });

        await expect(collectorBalance()).resolves.toBe(
          balance + BigInt(Math.round(authorization.json.data.bill_amount * 1e6)),
        );
        expect(response.status).toBe(200);
      });

      it("clears credit", async () => {
        const balance = await collectorBalance();
        const amount = 10;

        const operation = "credits";
        await database.insert(cards).values([{ id: "credits", credentialId: "cred", lastFour: "7890", mode: 1 }]);
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            event_type: "CLEARING",
            operation_id: operation,
            data: { ...authorization.json.data, card_id: "credits", bill_amount: amount, metadata: { account } },
          },
        });
        const transaction = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });
        await publicClient.waitForTransactionReceipt({ hash: transaction?.hash as Hex });

        await expect(collectorBalance()).resolves.toBe(balance + BigInt(Math.round(amount * 1e6)));
        expect(response.status).toBe(200);
      });

      it("clears installments", async () => {
        const balance = await collectorBalance();
        const amount = 100;

        const operation = "splits";
        await database.insert(cards).values([{ id: "splits", credentialId: "cred", lastFour: "6754", mode: 6 }]);
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            event_type: "CLEARING",
            operation_id: operation,
            data: { ...authorization.json.data, card_id: "splits", bill_amount: amount, metadata: { account } },
          },
        });
        const transaction = await database.query.transactions.findFirst({
          where: eq(transactions.id, operation),
        });
        await publicClient.waitForTransactionReceipt({ hash: transaction?.hash as Hex });

        await expect(collectorBalance()).resolves.toBe(balance + BigInt(Math.round(amount * 1e6)));
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
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            event_type: "CLEARING",
            operation_id: operation,
            data: { ...authorization.json.data, card_id: cardId, bill_amount: amount, metadata: { account } },
          },
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
        await database.insert(cards).values([{ id: "timeout", credentialId: "cred", lastFour: "7777", mode: 6 }]);
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            event_type: "CLEARING",
            operation_id: operation,
            data: { ...authorization.json.data, card_id: "timeout", bill_amount: 60, metadata: { account } },
          },
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
        await database.insert(cards).values([{ id: "revert", credentialId: "cred", lastFour: "8888", mode: 5 }]);
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            event_type: "CLEARING",
            operation_id: operation,
            data: { ...authorization.json.data, card_id: "revert", bill_amount: 70, metadata: { account } },
          },
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

        const cardId = "unexpected";
        await database.insert(cards).values([{ id: cardId, credentialId: "cred", lastFour: "8888", mode: 4 }]);
        const response = await appClient.index.$post({
          ...authorization,
          json: {
            ...authorization.json,
            event_type: "CLEARING",
            operation_id: "unexpected",
            data: { ...authorization.json.data, card_id: cardId, bill_amount: 90, metadata: { account } },
          },
        });

        expect(captureException).toHaveBeenCalledWith(new Error("Unexpected Error"), expect.anything());
        expect(response.status).toBe(569);
      });
    });
  });
});
