import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import React, { useState } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import AssetChange from "./AssetChange";
import AssetList from "./AssetList";
import { previewerAddress, useReadPreviewerExactly } from "../../generated/contracts";
import Text from "../shared/Text";

export default function Balance() {
  const [isOpen, setIsOpen] = useState(false);
  const { address } = useAccount();
  const { data: markets } = useReadPreviewerExactly({
    address: previewerAddress,
    account: address,
    args: [address ?? zeroAddress],
  });

  let usdBalance = 0n;
  if (markets) {
    for (const market of markets) {
      if (market.floatingDepositAssets > 0n) {
        usdBalance += (market.floatingDepositAssets * market.usdPrice) / BigInt(10 ** market.decimals);
      }
    }
  }

  function onPress() {
    setIsOpen(!isOpen);
  }
  return (
    <View display="flex" gap="$s4_5">
      <View display="flex" flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text
          fontSize={ms(15)}
          lineHeight={ms(21)}
          fontWeight="bold"
          color="$uiNeutralSecondary"
          textAlign="center"
          width="100%"
        >
          Balance
        </Text>
      </View>
      <View display="flex" gap="$s3_5">
        <Pressable onPress={onPress}>
          <View flexDirection="row" justifyContent="center" alignItems="center" gap="$s3_5">
            <View flexDirection="row" flex={1} justifyContent="flex-end" maxWidth="100%">
              <Text textAlign="center" fontFamily="$mono" fontSize={ms(40)} fontWeight="bold" overflow="hidden">
                {Number(usdBalance / BigInt(10 ** 18)).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  currencySign: "standard",
                  currencyDisplay: "symbol",
                })}
              </Text>
            </View>
            <View flexDirection="row" flex={1} justifyContent="flex-start">
              {isOpen ? (
                <ChevronUp size={ms(32)} color="$uiBrandSecondary" fontWeight="bold" />
              ) : (
                <ChevronDown size={ms(32)} color="$uiBrandSecondary" fontWeight="bold" />
              )}
            </View>
          </View>
        </Pressable>
        <AssetChange />
      </View>
      {isOpen && <AssetList />}
    </View>
  );
}
