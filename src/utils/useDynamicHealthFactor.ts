import { WAD } from "@exactly/lib";

import useMarketAccount from "./useMarketAccount";

export default function useDynamicHealthFactor() {
  const { markets } = useMarketAccount();

  const calculateDynamicHealthFactor = (): bigint | undefined => {
    if (!markets) return;

    for (const market of markets) {
      if (market.floatingBorrowAssets > 0n) return;
      if (market.fixedBorrowPositions.length > 0) return;
      if (market.symbol !== "exaUSDC" && market.floatingDepositAssets > 0n) return;
    }
    return WAD;
  };

  return {
    markets,
    calculateDynamicHealthFactor,
  };
}
