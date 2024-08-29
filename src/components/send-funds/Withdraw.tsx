import { previewerAddress } from "@exactly/common/generated/chain";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useMemo } from "react";
import { zeroAddress, type Address } from "viem";
import { useAccount, useWriteContract } from "wagmi";

import TransactionError from "./Error";
import Pending from "./Pending";
import Review from "./Review";
import Success from "./Success";
import { useReadPreviewerExactly, useSimulateExaPluginPropose } from "../../generated/contracts";
import SafeView from "../shared/SafeView";
import View from "../shared/View";

export default function Withdraw() {
  const { data } = useQuery<{
    receiver?: Address;
    market?: Address;
    amount: bigint;
  }>({ queryKey: ["withdrawal"] });
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  const assetMarket = useMemo(() => markets?.find(({ market }) => market === data?.market), [markets, data]);

  const { data: proposeSimulation } = useSimulateExaPluginPropose({
    address,
    args: [assetMarket?.market ?? zeroAddress, data?.amount ?? 0n, data?.receiver ?? zeroAddress],
    query: { enabled: !!data && !!markets && !!address && !!assetMarket },
  });

  const { writeContract, data: hash, isPending, isSuccess, isError, isIdle } = useWriteContract();

  let amount = 0n;
  let usdValue = 0n;
  if (data && assetMarket) {
    amount = (data.amount * 10n ** 18n) / 10n ** BigInt(assetMarket.decimals);
    usdValue = (data.amount * assetMarket.usdPrice) / 10n ** BigInt(assetMarket.decimals);
  }

  const handleSubmit = useCallback(() => {
    if (!proposeSimulation) throw new Error("no propose simulation");
    writeContract(proposeSimulation.request);
  }, [writeContract, proposeSimulation]);

  return (
    <SafeView fullScreen>
      <View fullScreen>
        {isIdle && (
          <Review
            assetName={assetMarket?.assetName ?? ""}
            amount={amount}
            usdValue={usdValue}
            canSend={!!proposeSimulation}
            onSend={handleSubmit}
            isFirstSend // TODO grab from recent contacts
          />
        )}
        {isPending && (
          <Pending assetName={assetMarket?.assetName ?? ""} amount={amount} usdValue={usdValue} hash={hash} />
        )}
        {isSuccess && (
          <Success assetName={assetMarket?.assetName ?? ""} amount={amount} usdValue={usdValue} hash={hash} />
        )}
        {isError && (
          <TransactionError assetName={assetMarket?.assetName ?? ""} amount={amount} usdValue={usdValue} hash={hash} />
        )}
      </View>
    </SafeView>
  );
}
