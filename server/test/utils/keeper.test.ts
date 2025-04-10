import "../mocks/sentry";
import "../mocks/deployments";

import { erc20Abi, padHex, WaitForTransactionReceiptTimeoutError, zeroHash } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import * as actions from "viem/actions";
import { beforeAll, describe, expect, inject, it, vi } from "vitest";

import deriveAddress from "../../utils/deriveAddress";
import keeper from "../../utils/keeper";
import publicClient from "../../utils/publicClient";

describe("with funds", () => {
  const bob = privateKeyToAddress(padHex("0xb0b"));
  const account = deriveAddress(inject("ExaAccountFactory"), { x: padHex(bob), y: zeroHash });

  beforeAll(async () => {
    await keeper.writeContract({
      address: inject("USDC"),
      abi: mockERC20Abi,
      functionName: "mint",
      args: [keeper.account.address, 400e6],
    });
  });

  it("executes a contract function", async () => {
    const onHash = vi.fn();
    const receipt = await keeper.exaSend(
      { name: "test transfer", op: "test.transfer", attributes: { account } },
      {
        address: inject("USDC"),
        abi: [...erc20Abi],
        functionName: "transfer",
        args: [account, 100e6],
      },
      { onHash },
    );

    expect(onHash).toHaveBeenCalledOnce();
    expect(receipt?.status).toBe("success");
  });

  it("executes a contract function after a timeout", async () => {
    // vi.spyOn(actions, "sendRawTransaction").mockResolvedValue("0x0");
    vi.spyOn(publicClient, "waitForTransactionReceipt").mockRejectedValueOnce(
      new WaitForTransactionReceiptTimeoutError({ hash: "0x0" }),
    );
    const onHash = vi.fn();
    const k = keeper;
    const receipt = await k.exaSend(
      { name: "test transfer", op: "test.transfer", attributes: { account } },
      {
        address: inject("USDC"),
        abi: [...erc20Abi],
        functionName: "transfer",
        args: [account, 100e6],
      },
      { onHash },
    );

    expect(onHash).toHaveBeenCalledOnce();
    expect(receipt?.status).toBe("success");
    //expect(sendRawTransaction).toHaveBeenCalledTimes(2);
  });
});

const mockERC20Abi = [
  {
    type: "function",
    name: "mint",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
];
