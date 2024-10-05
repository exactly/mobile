import { Address } from "@exactly/common/validation";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect } from "react";
import { parse } from "valibot";
import { formatUnits, zeroAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";

import type { Withdraw as IWithdraw } from "../../utils/queryClient";

import { useSimulateExaPluginPropose } from "../../generated/contracts";
import queryClient from "../../utils/queryClient";
import useMarketAccount from "../../utils/useMarketAccount";
import WAD from "../../utils/WAD";
import SafeView from "../shared/SafeView";
import View from "../shared/View";
import Failure from "./Failure";
import Pending from "./Pending";
import Review from "./Review";
import Success from "./Success";

export interface WithdrawDetails {
  amount: string;
  assetName?: string;
  usdValue: string;
}

export default function Withdraw() {
  const { address } = useAccount();
  const { data: withdraw } = useQuery<IWithdraw>({ queryKey: ["withdrawal"] });
  const { market } = useMarketAccount(withdraw?.market);
  const { data: proposeSimulation } = useSimulateExaPluginPropose({
    address,
    args: [market?.market ?? zeroAddress, withdraw?.amount ?? 0n, withdraw?.receiver ?? zeroAddress],
    query: { enabled: !!withdraw && !!market && !!address },
  });
  const { data: proposeHash, isError, isIdle, isPending, isSuccess, writeContract: propose } = useWriteContract();

  const handleSubmit = useCallback(() => {
    if (!proposeSimulation) throw new Error("no propose simulation");
    propose(proposeSimulation.request);
  }, [propose, proposeSimulation]);

  const details: WithdrawDetails = {
    amount: formatUnits(withdraw?.amount ?? 0n, market?.decimals ?? 0),
    assetName: market?.assetName,
    usdValue: formatUnits(((withdraw?.amount ?? 0n) * (market?.usdPrice ?? 0n)) / WAD, market?.decimals ?? 0),
  };

  useEffect(() => {
    if (isSuccess) {
      queryClient.setQueryData<{ address: Address; ens: string }[] | undefined>(["contacts", "recent"], (old) =>
        [{ address: parse(Address, withdraw?.receiver), ens: "" }, ...(old ?? [])].slice(0, 3),
      );
    }
  }, [isSuccess, withdraw?.receiver]);
  return (
    <SafeView fullScreen>
      <View fullScreen>
        {isIdle && <Review canSend={!!proposeSimulation} details={details} isFirstSend onSend={handleSubmit} />}
        {isPending && <Pending details={details} hash={proposeHash} />}
        {isSuccess && <Success details={details} hash={proposeHash} />}
        {isError && <Failure details={details} hash={proposeHash} />}
      </View>
    </SafeView>
  );
}
