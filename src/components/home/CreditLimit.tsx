import { previewerAddress, usdcAddress } from "@exactly/common/generated/chain";
import React from "react";
import { ms } from "react-native-size-matters";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import InfoCard from "./InfoCard";
import { useReadPreviewerExactly } from "../../generated/contracts";
import Text from "../shared/Text";

export default function CreditLimit() {
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });
  let creditLimit = 0n;
  if (markets) {
    const usdcMarket = markets.find((market) => market.asset === usdcAddress);
    if (!usdcMarket) return;
    creditLimit = (usdcMarket.maxBorrowAssets * usdcMarket.usdPrice) / 10n ** BigInt(usdcMarket.decimals);
  }
  return (
    <InfoCard title="Credit limit">
      <Text sensitive color="$uiNeutralPrimary" fontFamily="$mono" fontSize={ms(30)}>
        {(Number(creditLimit) / 1e18).toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        })}
      </Text>
    </InfoCard>
  );
}
