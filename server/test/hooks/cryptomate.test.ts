import "../mockDeployments";
import "../mockSentry";

import { exaAccountFactoryAbi, exaPluginAbi } from "@exactly/common/generated/chain";
import { testClient } from "hono/testing";
import Redis from "ioredis-mock";
import { hexToBigInt, padHex, zeroAddress, zeroHash } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { beforeAll, describe, expect, inject, it, vi } from "vitest";

import app from "../../hooks/cryptomate";
import deriveAddress from "../../utils/deriveAddress";
import keeper from "../../utils/keeper";

vi.mock("ioredis", () => ({ Redis }));

const appClient = testClient(app);

const authorization = {
  header: { "x-webhook-key": "cryptomate" },
  json: {
    data: {
      bill_amount: 0.01,
      bill_currency_code: "USD",
      bill_currency_number: "840",
      card_id: "card",
      created_at: new Date().toISOString(),
      metadata: { account: zeroAddress },
      signature: "0x",
    },
    event_type: "AUTHORIZATION",
    operation_id: "op",
    product: "CARDS",
    status: "PENDING",
  },
} as const;

describe("validation", () => {
  it("fails with bad key", async () => {
    const response = await appClient.index.$post({ ...authorization, header: { "x-webhook-key": "bad" } });

    expect(response.status).toBe(401);
  });

  it("accepts valid request", async () => {
    const response = await appClient.index.$post(authorization);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ response_code: "51" });
  });
});

describe("authorization", () => {
  const owner = privateKeyToAccount(generatePrivateKey());
  const account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(owner.address), y: zeroHash });

  beforeAll(async () => {
    await keeper.writeContract({
      abi: [{ inputs: [{ type: "address" }, { type: "uint256" }], name: "mint", type: "function" }],
      address: inject("USDC"),
      args: [account, 420e6],
      functionName: "mint",
    });
    await keeper.writeContract({
      abi: exaAccountFactoryAbi,
      address: inject("ExaAccountFactory"),
      args: [0n, [{ x: hexToBigInt(owner.address), y: 0n }]],
      functionName: "createAccount",
    });
  });

  it("authorizes", async () => {
    await keeper.writeContract({
      abi: exaPluginAbi,
      address: account,
      args: [inject("MarketUSDC")],
      functionName: "poke",
    });

    const response = await appClient.index.$post({
      ...authorization,
      json: { ...authorization.json, data: { ...authorization.json.data, metadata: { account } } },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ response_code: "00" });
  });
});
