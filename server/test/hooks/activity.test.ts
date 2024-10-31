import "../mocks/alchemy";
import "../mocks/database";
import "../mocks/deployments";
import "../mocks/sentry";

import { previewerAddress, wethAddress } from "@exactly/common/generated/chain";
import { Address } from "@exactly/common/validation";
import * as sentry from "@sentry/node";
import { testClient } from "hono/testing";
import { parse } from "valibot";
import {
  hexToBigInt,
  padHex,
  parseEther,
  zeroHash,
  parseEventLogs,
  bytesToHex,
  numberToBytes,
  type PrivateKeyAccount,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { afterEach, beforeEach, describe, expect, inject, it, vi } from "vitest";

import database, { credentials } from "../../database";
import { previewerAbi, marketAbi } from "../../generated/contracts";
import app from "../../hooks/activity";
import * as decodePublicKey from "../../utils/decodePublicKey";
import deriveAddress from "../../utils/deriveAddress";
import keeper from "../../utils/keeper";
import publicClient from "../../utils/publicClient";
import anvilClient from "../anvilClient";

const appClient = testClient(app);

const activityPayload = {
  header: undefined,
  json: {
    type: "ADDRESS_ACTIVITY",
    event: {
      network: "OPT_SEPOLIA",
      activity: [
        {
          fromAddress: "0x3372cf7cad49a330f7b7403eaa544444d5985877",
          toAddress: "0x34716d493d69b11fd52d3242cf1eeec8585a1491",
          hash: "0x9848781a8540d8d724ed86d3565506ab35eb309b332c52fef2cef22195dd184f",
          value: 0.000_001,
          asset: "ETH",
          category: "external",
          rawContract: {},
        },
        {
          fromAddress: "0xacd03d601e5bb1b275bb94076ff46ed9d753435a",
          toAddress: "0xbaff9578e9f473ffa1431334d57fdc153e759153",
          hash: "0x2c459cae2c7cb48394c5272c67dccc71f7f251cff2cbb36b8efb9b3c9f16656b",
          value: 99.973,
          asset: "WETH",
          category: "token",
          rawContract: {
            rawValue: "0x0000000000000000000000000000000000000000000000000000000005f57788",
            address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
            decimals: 18,
          },
        },
      ],
    },
  },
} as const;

const waitForDeposit = async (caller: Address, quantity: number, timeout = 1000) => {
  let counter = quantity;
  return new Promise((resolve) => {
    const unwatch = publicClient.watchEvent({
      onLogs: (logs) => {
        const deposit = parseEventLogs({
          abi: marketAbi,
          logs,
        }).filter((log) => log.eventName === "Deposit" && parse(Address, `0x${log.topics[1].slice(26)}`) === caller);
        counter -= deposit.length;
        if (counter <= 0) {
          unwatch();
          resolve(deposit);
        }
      },
    });

    setTimeout(() => {
      unwatch();
      resolve([]);
    }, timeout);
  });
};

describe("address activity", () => {
  let owner: PrivateKeyAccount;
  let account: Address;

  beforeEach(async () => {
    owner = privateKeyToAccount(generatePrivateKey());
    account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(owner.address), y: zeroHash });

    const x = numberToBytes(hexToBigInt(owner.address));
    const y = numberToBytes(0n);
    vi.spyOn(decodePublicKey, "default").mockReturnValue({ x: bytesToHex(x), y: bytesToHex(y) });

    await database
      .insert(credentials)
      .values([{ id: account, publicKey: new Uint8Array(), account, factory: inject("ExaAccountFactory") }]);
  });

  afterEach(() => vi.restoreAllMocks());

  it("fails with unexpected error", async () => {
    const captureException = vi.spyOn(sentry, "captureException");
    captureException.mockImplementationOnce(() => "");

    vi.spyOn(publicClient, "getCode").mockRejectedValue(new Error("Unexpected"));

    const deposit = parseEther("5");
    await anvilClient.setBalance({ address: account, value: deposit });

    const response = await appClient.index.$post({
      ...activityPayload,
      json: {
        ...activityPayload.json,
        event: {
          ...activityPayload.json.event,
          activity: [{ ...activityPayload.json.event.activity[0], toAddress: account }],
        },
      },
    });

    const deposits = await waitForDeposit(account, 1);

    expect(captureException).toHaveBeenCalledWith(new Error("Unexpected"));

    expect(deposits).toHaveLength(0);
    expect(response.status).toBe(200);
  });

  it("fails with transaction timeout", async () => {
    const captureException = vi.spyOn(sentry, "captureException");
    captureException.mockImplementation(() => "");

    vi.spyOn(publicClient, "waitForTransactionReceipt").mockRejectedValue(new Error("Transaction Timeout"));

    const deposit = parseEther("5");
    await anvilClient.setBalance({ address: account, value: deposit });

    const response = await appClient.index.$post({
      ...activityPayload,
      json: {
        ...activityPayload.json,
        event: {
          ...activityPayload.json.event,
          activity: [{ ...activityPayload.json.event.activity[0], toAddress: account }],
        },
      },
    });

    const deposits = await waitForDeposit(account, 1);

    expect(captureException).toHaveBeenCalledWith(new Error("account deployment reverted"));

    expect(deposits).toHaveLength(0);
    expect(response.status).toBe(200);
  });

  it("pokes eth", async () => {
    const deposit = parseEther("5");
    await anvilClient.setBalance({ address: account, value: deposit });

    const response = await appClient.index.$post({
      ...activityPayload,
      json: {
        ...activityPayload.json,
        event: {
          ...activityPayload.json.event,
          activity: [{ ...activityPayload.json.event.activity[0], toAddress: account }],
        },
      },
    });

    await waitForDeposit(account, 1);

    const exactly = await publicClient.readContract({
      address: previewerAddress,
      functionName: "exactly",
      abi: previewerAbi,
      args: [account],
    });

    const market = exactly.find((m) => m.asset === wethAddress);

    expect(market?.floatingDepositAssets).toBe(deposit);
    expect(market?.isCollateral).toBeTruthy();
    expect(response.status).toBe(200);
  });

  it("pokes weth and eth", async () => {
    const eth = parseEther("5");
    await anvilClient.setBalance({ address: account, value: eth });

    const weth = parseEther("2");
    await keeper.writeContract({
      address: wethAddress,
      abi: [{ type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }] }],
      functionName: "mint",
      args: [account, weth],
    });

    const response = await appClient.index.$post({
      ...activityPayload,
      json: {
        ...activityPayload.json,
        event: {
          ...activityPayload.json.event,
          activity: [
            { ...activityPayload.json.event.activity[0], toAddress: account },
            {
              ...activityPayload.json.event.activity[1],
              toAddress: account,
              rawContract: { ...activityPayload.json.event.activity[1].rawContract, address: wethAddress },
            },
          ],
        },
      },
    });

    await waitForDeposit(account, 2);

    const exactly = await publicClient.readContract({
      address: previewerAddress,
      functionName: "exactly",
      abi: previewerAbi,
      args: [account],
    });

    const market = exactly.find((m) => m.asset === wethAddress);

    expect(market?.floatingDepositAssets).toBe(eth + weth);
    expect(market?.isCollateral).toBeTruthy();
    expect(response.status).toBe(200);
  });
});
