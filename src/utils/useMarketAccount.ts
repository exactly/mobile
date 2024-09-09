import { previewerAddress } from "@exactly/common/generated/chain";
import { useMemo } from "react";
import { zeroAddress, type Address } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../generated/contracts";

export default function useMarketAccount(address?: Address) {
  const { address: account } = useAccount();
  const { data: markets, queryKey } = useReadPreviewerExactly({
    address: previewerAddress,
    args: [account ?? zeroAddress],
  });
  return {
    account,
    market: useMemo(() => markets?.find(({ market }) => market === address), [address, markets]),
    queryKey,
  };
}
