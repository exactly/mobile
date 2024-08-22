import { previewerAddress } from "@exactly/common/generated/chain";
import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import React, { useState } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";
import { zeroAddress } from "viem";
import { useAccount } from "wagmi";

import AssetChange from "./AssetChange";
import AssetList from "./AssetList";
import { useReadPreviewerExactly } from "../../generated/contracts";
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
        usdBalance += (market.floatingDepositAssets * market.usdPrice) / 10n ** BigInt(market.decimals);
      }
    }
  }
  return (
    <View display="flex" gap="$s4_5" justifyContent="center">
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
      <View gap="$s3_5">
        <Pressable
          onPress={() => {
            setIsOpen(!isOpen);
          }}
        >
          <View flexDirection="row" justifyContent="center" alignItems="center" gap="$s3_5">
            <View flexDirection="row" maxWidth="100%">
              <Text textAlign="center" fontFamily="$mono" fontSize={ms(40)} fontWeight="bold" overflow="hidden">
                {(Number(usdBalance) / 1e18).toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                })}
              </Text>
            </View>
            <View>
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
