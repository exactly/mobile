import "../mocks/database";
import "../mocks/deployments";
import "../mocks/onesignal";
import "../mocks/panda";
import "../mocks/redis";
import "../mocks/sentry";
import "../mocks/keeper";

import ProposalType from "@exactly/common/ProposalType";
import chain, {
  exaAccountFactoryAbi,
  exaPluginAbi,
  upgradeableModularAccountAbi,
} from "@exactly/common/generated/chain";
import * as sentry from "@sentry/node";
import { eq } from "drizzle-orm";
import { testClient } from "hono/testing";
import {
  BaseError,
  createWalletClient,
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  hexToBigInt,
  http,
  padHex,
  zeroAddress,
  zeroHash,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterEach, beforeAll, describe, expect, inject, it, vi } from "vitest";

import database, { cards, credentials, transactions } from "../../database";
import { auditorAbi, issuerCheckerAbi, marketAbi } from "../../generated/contracts";
import app from "../../hooks/panda";
import deriveAddress from "../../utils/deriveAddress";
import keeper from "../../utils/keeper";
import publicClient from "../../utils/publicClient";
import traceClient from "../../utils/traceClient";
import anvilClient from "../anvilClient";

const appClient = testClient(app);
const owner = createWalletClient({ chain, transport: http(), account: privateKeyToAccount(generatePrivateKey()) });
const account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(owner.account.address), y: zeroHash });

beforeAll(async () => {
  await database
    .insert(credentials)
    .values([{ id: "cred", publicKey: new Uint8Array(), account, factory: zeroAddress }]);
  await database.insert(cards).values([{ id: "card", credentialId: "cred", lastFour: "1234" }]);
  await anvilClient.setBalance({ address: owner.account.address, value: 10n ** 24n });
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
      args: [0n, [{ x: hexToBigInt(owner.account.address), y: 0n }]],
    });
  });

  describe("authorization", () => {
    describe("with collateral", () => {
      beforeAll(async () => {
        await keeper.writeContract({
          address: inject("USDC"),
          abi: [
            {
              type: "function",
              name: "mint",
              inputs: [{ type: "address" }, { type: "uint256" }],
              outputs: [],
              stateMutability: "nonpayable",
            },
          ],
          functionName: "mint",
          args: [account, 420_000_000n],
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
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            body: { ...authorization.json.body, spend: { ...authorization.json.body.spend, cardId: "card" } },
          },
        });

        expect(response.status).toBe(200);
      });

      it("authorizes debit", async () => {
        await database.insert(cards).values([{ id: "debit", credentialId: "cred", lastFour: "5678", mode: 0 }]);

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            body: { ...authorization.json.body, spend: { ...authorization.json.body.spend, cardId: "debit" } },
          },
        });

        expect(response.status).toBe(200);
      });

      it("authorizes installments", async () => {
        await database.insert(cards).values([{ id: "inst", credentialId: "cred", lastFour: "5678", mode: 6 }]);

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            body: { ...authorization.json.body, spend: { ...authorization.json.body.spend, cardId: "inst" } },
          },
        });

        expect(response.status).toBe(200);
      });

      it("authorizes zero", async () => {
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            body: {
              ...authorization.json.body,
              spend: { ...authorization.json.body.spend, cardId: "card", amount: 0 },
            },
          },
        });

        expect(response.status).toBe(200);
      });

      it("fails when tracing", async () => {
        const captureException = vi.spyOn(sentry, "captureException");
        captureException.mockImplementation(() => "");

        const trace = vi.spyOn(traceClient, "traceCall").mockResolvedValue({ ...callFrame, output: "0x" });

        await database.insert(cards).values([{ id: "failed_trace", credentialId: "cred", lastFour: "2222", mode: 4 }]);

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            body: { ...authorization.json.body, spend: { ...authorization.json.body.spend, cardId: "failed_trace" } },
          },
        });

        expect(trace).toHaveBeenCalledOnce();
        expect(captureException).toHaveBeenCalledWith(new Error("0x"), expect.anything());
        expect(response.status).toBe(550);
      });

      describe("with drain proposal", () => {
        beforeAll(async () => {
          await execute(
            encodeFunctionData({
              abi: exaPluginAbi,
              functionName: "propose",
              args: [
                inject("MarketUSDC"),
                420_000_000n - 1n,
                ProposalType.Withdraw,
                encodeAbiParameters([{ type: "address" }], [owner.account.address]),
              ],
            }),
          );
        });

        it("declines collection", async () => {
          await database.insert(cards).values([{ id: "drain", credentialId: "cred", lastFour: "5678", mode: 0 }]);
          vi.spyOn(sentry, "captureException").mockImplementation(() => "");

          const response = await appClient.index.$post({
            ...authorization,
            header: { signature: "panda-signature" },
            json: {
              ...authorization.json,
              body: { ...authorization.json.body, spend: { ...authorization.json.body.spend, cardId: "drain" } },
            },
          });

          expect(response.status).toBe(550);
        });
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
        const operation = "debits";
        const cardId = "debits";
        await database.insert(cards).values([{ id: "debits", credentialId: "cred", lastFour: "3456", mode: 0 }]);
        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            action: "created",
            body: {
              ...authorization.json.body,
              id: operation,
              spend: { ...authorization.json.body.spend, cardId },
            },
          },
        });
        const card = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });
        const purchaseReceipt = await publicClient.waitForTransactionReceipt({ hash: card?.hashes[0] as Hex });

        expect(usdcToCollector(purchaseReceipt)).toBe(BigInt(authorization.json.body.spend.amount * 1e4));

        expect(response.status).toBe(200);
      });

      it("clears credit", async () => {
        const amount = 10;

        const operation = "credits";
        const cardId = "credits";
        await database.insert(cards).values([{ id: "credits", credentialId: "cred", lastFour: "7890", mode: 1 }]);

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            action: "created",
            body: {
              ...authorization.json.body,
              id: operation,
              spend: { ...authorization.json.body.spend, cardId, amount },
            },
          },
        });

        const transaction = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });
        const purchaseReceipt = await publicClient.waitForTransactionReceipt({ hash: transaction?.hashes[0] as Hex });

        expect(usdcToCollector(purchaseReceipt)).toBe(BigInt(amount * 1e4));
        expect(response.status).toBe(200);
      });

      it("clears with transaction update", async () => {
        const amount = 100;
        const update = 50;

        const operation = "transactionUpdate";
        const cardId = "tUpdate";
        await database.insert(cards).values([{ id: cardId, credentialId: "cred", lastFour: "8888", mode: 1 }]);
        const createResponse = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            action: "created",
            body: {
              ...authorization.json.body,
              id: operation,
              spend: { ...authorization.json.body.spend, cardId, amount, localAmount: amount },
            },
          },
        });

        const updateResponse = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            action: "updated",
            body: {
              ...authorization.json.body,
              id: operation,
              spend: {
                ...authorization.json.body.spend,
                cardId,
                authorizationUpdateAmount: update,
                amount: amount + update,
                localAmount: amount + update,
              },
            },
          },
        });

        const transaction = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await Promise.all(transaction!.hashes.map((h) => publicClient.waitForTransactionReceipt({ hash: h as Hex })));

        expect(createResponse.status).toBe(200);
        expect(updateResponse.status).toBe(200);

        expect(transaction?.payload).toMatchObject({
          bodies: [{ action: "created" }, { action: "updated", body: { spend: { amount: amount + update } } }],
          merchant: {
            city: "buenos aires",
            country: "argentina",
            name: "99999",
          },
        });
      });

      it("clears installments", async () => {
        const amount = 120;

        const operation = "splits";
        const cardId = "splits";
        await database.insert(cards).values([{ id: "splits", credentialId: "cred", lastFour: "6754", mode: 6 }]);

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            action: "created",
            body: {
              ...authorization.json.body,
              id: operation,
              spend: { ...authorization.json.body.spend, cardId, amount },
            },
          },
        });

        const transaction = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });
        const purchaseReceipt = await publicClient.waitForTransactionReceipt({ hash: transaction?.hashes[0] as Hex });

        expect(usdcToCollector(purchaseReceipt)).toBe(BigInt(amount * 1e4));
        expect(response.status).toBe(200);
      });

      it("fails with transaction timeout", async () => {
        const captureException = vi.spyOn(sentry, "captureException");
        captureException.mockImplementation(() => "");

        vi.spyOn(publicClient, "waitForTransactionReceipt").mockRejectedValue(new Error("timeout"));

        const operation = "timeout";
        const cardId = "timeout";
        await database.insert(cards).values([{ id: cardId, credentialId: "cred", lastFour: "7777", mode: 6 }]);

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            action: "created",
            body: {
              ...authorization.json.body,
              id: operation,
              spend: { ...authorization.json.body.spend, cardId, amount: 60 },
            },
          },
        });

        const transaction = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });

        expect(captureException).toHaveBeenNthCalledWith(
          1,
          new Error("timeout"),
          expect.objectContaining({ level: "error" }),
        );
        expect(captureException).toHaveBeenNthCalledWith(
          2,
          new Error("timeout"),
          expect.objectContaining({ level: "fatal" }),
        );
        expect(transaction).toBeDefined();
        expect(response.status).toBe(569);
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

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            action: "created",
            body: {
              ...authorization.json.body,
              id: operation,
              spend: { ...authorization.json.body.spend, cardId, amount: 70 },
            },
          },
        });

        const transaction = await database.query.transactions.findFirst({ where: eq(transactions.id, operation) });

        expect(captureException).toHaveBeenNthCalledWith(
          1,
          expect.any(BaseError),
          expect.objectContaining({ level: "error" }),
        );
        expect(captureException).toHaveBeenNthCalledWith(
          2,
          expect.any(BaseError),
          expect.objectContaining({ level: "fatal" }),
        );
        expect(transaction).toBeDefined();
        expect(response.status).toBe(569);
      });

      it("fails with unexpected error", async () => {
        const captureException = vi.spyOn(sentry, "captureException");
        captureException.mockImplementation(() => "");

        vi.spyOn(publicClient, "simulateContract").mockRejectedValue(new Error("Unexpected Error"));

        const operation = "unexpected";
        const cardId = "unexpected";
        await database.insert(cards).values([{ id: cardId, credentialId: "cred", lastFour: "8888", mode: 4 }]);

        const response = await appClient.index.$post({
          ...authorization,
          header: { signature: "panda-signature" },
          json: {
            ...authorization.json,
            action: "created",
            body: {
              ...authorization.json.body,
              id: operation,
              spend: { ...authorization.json.body.spend, cardId, amount: 90 },
            },
          },
        });

        expect(captureException).toHaveBeenCalledWith(new Error("Unexpected Error"), expect.anything());
        expect(response.status).toBe(569);
      });

      describe("with drain proposal", () => {
        beforeAll(async () => {
          await execute(
            encodeFunctionData({
              abi: exaPluginAbi,
              functionName: "propose",
              args: [
                inject("MarketUSDC"),
                420_000_000n - 1n,
                ProposalType.Withdraw,
                encodeAbiParameters([{ type: "address" }], [owner.account.address]),
              ],
            }),
          );
        });

        it("clears debit", async () => {
          const amount = 180;
          await database.insert(cards).values([{ id: "drain-coll", credentialId: "cred", lastFour: "5678", mode: 0 }]);

          const response = await appClient.index.$post({
            ...authorization,
            header: { signature: "panda-signature" },
            json: {
              ...authorization.json,
              action: "created",
              body: {
                ...authorization.json.body,
                id: "drain-coll",
                spend: { ...authorization.json.body.spend, cardId: "drain-coll", amount },
              },
            },
          });

          expect(response.status).toBe(200);
        });
      });
    });
  });
});

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

function usdcToCollector(purchaseReceipt: TransactionReceipt) {
  return purchaseReceipt.logs
    .filter((l) => l.address.toLowerCase() === inject("USDC").toLowerCase())
    .map((l) => decodeEventLog({ abi: erc20Abi, eventName: "Transfer", topics: l.topics, data: l.data }))
    .filter((l) => l.args.to === "0xDb90CDB64CfF03f254e4015C4F705C3F3C834400")
    .reduce((total, l) => total + l.args.value, 0n);
}

function execute(calldata: Hex) {
  return owner.writeContract({
    address: account,
    functionName: "execute",
    args: [account, 0n, calldata],
    abi: [...exaPluginAbi, ...issuerCheckerAbi, ...upgradeableModularAccountAbi, ...auditorAbi, ...marketAbi],
  });
}
