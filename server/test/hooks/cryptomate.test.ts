import "../mocks/database";
import "../mocks/deployments";
import "../mocks/redis";
import "../mocks/sentry";

import { exaAccountFactoryAbi, exaPluginAbi } from "@exactly/common/generated/chain";
import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { hexToBigInt, padHex, zeroAddress, zeroHash } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { beforeAll, describe, expect, inject, it, vi } from "vitest";

import database, { cards, credentials } from "../../database";
import app from "../../hooks/cryptomate";
import deriveAddress from "../../utils/deriveAddress";
import keeper from "../../utils/keeper";

const appClient = testClient(app);

const authorization = {
  header: { "x-webhook-key": "cryptomate" },
  json: {
    event_type: "AUTHORIZATION",
    status: "PENDING",
    product: "CARDS",
    operation_id: "op",
    data: {
      bill_currency_code: "USD",
      bill_currency_number: "840",
      bill_amount: 100,
      card_id: "card",
      created_at: new Date().toISOString(),
      metadata: { account: zeroAddress },
      signature: "0x",
    },
  },
} as const;

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

describe("authorization", () => {
  beforeAll(async () => {
    await keeper.writeContract({
      address: inject("USDC"),
      abi: [{ type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }] }],
      functionName: "mint",
      args: [account, 420e6],
    });
    await keeper.writeContract({
      address: inject("ExaAccountFactory"),
      abi: exaAccountFactoryAbi,
      functionName: "createAccount",
      args: [0n, [{ x: hexToBigInt(owner.address), y: 0n }]],
    });
  });

  describe("with collateral", () => {
    beforeAll(async () => {
      await keeper.writeContract({
        address: account,
        abi: exaPluginAbi,
        functionName: "poke",
        args: [inject("MarketUSDC")],
      });
    });

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
        json: { ...authorization.json, data: { ...authorization.json.data, card_id: "debit", metadata: { account } } },
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
  });
});
