import { testClient } from "hono/testing";
import Redis from "ioredis-mock";
import { hexToBigInt, padHex, zeroAddress, zeroHash } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { beforeAll, describe, expect, inject, it, vi } from "vitest";

import "./utils/mockDeployments";
import app from "../hooks/cryptomate";
import deriveAddress from "../utils/deriveAddress";
import keeper from "../utils/keeper";

vi.mock("ioredis", () => ({ Redis }));

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
      bill_currency_number: 840,
      bill_amount: 0.01,
      card_id: "card",
      created_at: new Date().toISOString(),
      metadata: { account: zeroAddress },
      signature: "0x",
    },
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
    const { exaAccountFactoryAbi, exaPluginAbi } = await import("@exactly/common/generated/chain");
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
    await keeper.writeContract({
      address: account,
      abi: exaPluginAbi,
      functionName: "poke",
      args: [inject("MarketUSDC")],
    });
  });

  it("authorizes", async () => {
    const response = await appClient.index.$post({
      ...authorization,
      json: { ...authorization.json, data: { ...authorization.json.data, metadata: { account } } },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ response_code: "00" });
  });
});
