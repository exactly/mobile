import "../mocks/sentry";
import "../mocks/deployments";
import { keeperClient } from "../mocks/keeper"; // eslint-disable-line import/order -- must be imported early

import { describe, expect, inject, it, vi } from "vitest";

import { auditorAbi } from "../../generated/contracts";
import keeper from "../../utils/keeper";

describe("fault tolerance", () => {
  it("recovers if transaction is missing", async () => {
    const sendRawTransaction = vi.spyOn(keeperClient, "sendRawTransaction");
    sendRawTransaction.mockResolvedValueOnce("0x");
    const onHash = vi.fn<() => void>();
    const k = keeper;
    const receipt = await k.exaSend(
      { name: "test transfer", op: "test.transfer" },
      { address: inject("Auditor"), abi: auditorAbi, functionName: "enterMarket", args: [inject("MarketUSDC")] },
      { onHash },
    );

    expect(onHash).toHaveBeenCalledOnce();
    expect(receipt?.status).toBe("success");
    expect(sendRawTransaction).toHaveBeenCalledTimes(2);
  });
});
