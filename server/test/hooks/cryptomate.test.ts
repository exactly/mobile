import "../mockDeployments";
import "../mockSentry";

import { exaAccountFactoryAbi, exaPluginAbi, usdcAddress } from "@exactly/common/generated/chain";
import { Hex } from "@exactly/common/validation";
import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import Redis from "ioredis-mock";
import { parse } from "valibot";
import { hexToBigInt, padHex, zeroAddress, zeroHash, toHex, encodeEventTopics, erc20Abi, type Address } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { beforeEach, describe, expect, inject, it, vi } from "vitest";

import app from "../../hooks/cryptomate";
import deriveAddress from "../../utils/deriveAddress";
import keeper from "../../utils/keeper";
import publicClient, { type CallFrame } from "../../utils/publicClient";

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
      bill_currency_number: "840",
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
  let owner;
  let account: Address;

  const baseCallFrame: CallFrame = {
    type: "CALL",
    from: "0x1234567890abcdef1234567890abcdef12345678",
    to: "0xabcdef1234567890abcdef1234567890abcdef12",
    gas: "0x5208",
    gasUsed: "0x5200",
    input: "0x",
    value: "0xde0b6b3a7640000",
    error: undefined,
    revertReason: undefined,
  } as const;

  beforeEach(async () => {
    owner = privateKeyToAccount(generatePrivateKey());
    account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(owner.address), y: zeroHash });
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

  it("reports a bad collectCredit simulation", async () => {
    const captureException = vi.spyOn(sentry, "captureException").mockImplementationOnce(() => "");

    const response = await appClient.index.$post({
      ...authorization,
      json: { ...authorization.json, data: { ...authorization.json.data, bill_amount: 0, metadata: { account } } },
    });

    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(new Error("ZeroBorrow"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ response_code: "69" });
  });

  it("reports collector didn't receive funds", async () => {
    const traceCall = vi.spyOn(publicClient, "traceCall");

    traceCall.mockResolvedValueOnce(baseCallFrame);

    const response = await appClient.index.$post({
      ...authorization,
      json: { ...authorization.json, data: { ...authorization.json.data, metadata: { account } } },
    });

    expect(traceCall).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ response_code: "51" });
  });

  it("reports collector receive wrong funds", async () => {
    const traceCall = vi.spyOn(publicClient, "traceCall");

    const [transferTopic] = encodeEventTopics({ abi: erc20Abi, eventName: "Transfer" });
    const transferLog = {
      address: parse(Hex, usdcAddress.toLowerCase()),
      topics: [],
      data: padHex(toHex(4 * 1e6)),
      position: parse(Hex, "0x0"),
    };

    traceCall.mockResolvedValueOnce({
      ...baseCallFrame,
      logs: [
        {
          ...transferLog,
          topics: [
            parse(Hex, transferTopic),
            padHex(parse(Hex, "0xe0b89008304552823335Dc2d99783B9Ed74b1107".toLowerCase())),
            padHex(parse(Hex, process.env.COLLECTOR_ADDRESS?.toLowerCase())),
          ],
        },
      ],
    });

    const response = await appClient.index.$post({
      ...authorization,
      json: { ...authorization.json, data: { ...authorization.json.data, metadata: { account } } },
    });

    expect(traceCall).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ response_code: "51" });
  });

  it("reports unknown error", async () => {
    const captureException = vi.spyOn(sentry, "captureException").mockImplementationOnce(() => "");
    const traceCall = vi.spyOn(publicClient, "traceCall");
    const unknown = new Error("Unknown");
    traceCall.mockImplementationOnce(() => {
      throw unknown;
    });

    const response = await appClient.index.$post({
      ...authorization,
      json: { ...authorization.json, data: { ...authorization.json.data, metadata: { account } } },
    });

    expect(traceCall).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledOnce();
    expect(captureException).toHaveBeenCalledWith(unknown);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ response_code: "05" });
  });
});
