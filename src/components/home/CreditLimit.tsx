import { ChevronRight } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import InfoCard from "./InfoCard";
import { previewerAddress, usdcAddress, useReadPreviewerExactly } from "../../generated/contracts";
import Text from "../shared/Text";
import View from "../shared/View";

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
    <InfoCard
      title="Credit limit"
      renderAction={
        <Pressable>
          <View flexDirection="row" gap={2} alignItems="center">
            <Text color="$interactiveTextBrandDefault" emphasized footnote>
              Manage
            </Text>
            <ChevronRight size={14} color="$interactiveTextBrandDefault" fontWeight="bold" />
          </View>
        </Pressable>
      }
    >
      <Text color="$uiNeutralPrimary" fontFamily="$mono" fontSize={ms(30)}>
        {(Number(creditLimit) / 1e18).toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        })}
      </Text>
    </InfoCard>
  );
}
