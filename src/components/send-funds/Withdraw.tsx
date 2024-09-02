import { useQuery } from "@tanstack/react-query";
import React, { useCallback } from "react";
import { zeroAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";

import Failure from "./Failure";
import Pending from "./Pending";
import Review from "./Review";
import Success from "./Success";
import { useSimulateExaPluginPropose } from "../../generated/contracts";
import type { Withdraw as IWithdraw } from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";
import SafeView from "../shared/SafeView";
import View from "../shared/View";

export default function Withdraw() {
  const { address } = useAccount();
  const { data: withdraw } = useQuery<IWithdraw>({ queryKey: ["withdrawal"] });
  const { market } = useMarketAccount(withdraw?.market);
  const { data: proposeSimulation } = useSimulateExaPluginPropose({
    address,
    args: [market?.market ?? zeroAddress, withdraw?.amount ?? 0n, withdraw?.receiver ?? zeroAddress],
    query: { enabled: !!withdraw && !!market && !!address },
  });
  const { writeContract: propose, data: proposeHash, isPending, isSuccess, isError, isIdle } = useWriteContract();
  const amount = withdraw && market ? (withdraw.amount * 10n ** 18n) / 10n ** BigInt(market.decimals) : 0n;
  const usdValue = withdraw && market ? (withdraw.amount * market.usdPrice) / 10n ** BigInt(market.decimals) : 0n;
  const handleSubmit = useCallback(() => {
    if (!proposeSimulation) throw new Error("no propose simulation");
    propose(proposeSimulation.request);
  }, [propose, proposeSimulation]);
  const details: { assetName?: string; amount: bigint; usdValue: bigint } = {
    assetName: market?.assetName,
    amount,
    usdValue,
  };
  return (
    <SafeView fullScreen>
      <View fullScreen>
        {isIdle && <Review onSend={handleSubmit} details={details} canSend={!!proposeSimulation} isFirstSend />}
        {isPending && <Pending details={details} hash={proposeHash} />}
        {isSuccess && <Success details={details} hash={proposeHash} />}
        {isError && <Failure details={details} hash={proposeHash} />}
      </View>
    </SafeView>
  );
}
