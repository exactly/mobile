import { previewerAddress } from "@exactly/common/generated/chain";
import { useMemo } from "react";
import { zeroAddress, type Address } from "viem";
import { useAccount } from "wagmi";

import { useReadPreviewerExactly } from "../generated/contracts";

export default function useMarket(address?: Address) {
  const { address: account } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    account,
    address: previewerAddress,
    args: [account ?? zeroAddress],
  });
  return useMemo(() => address && markets?.find(({ market }) => market === address), [markets, address]);
}
