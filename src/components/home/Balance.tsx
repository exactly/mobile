import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons";
import React, { useState } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View, ButtonIcon } from "tamagui";
import { useAccount, useBalance } from "wagmi";

import AssetChange from "./AssetChange";
import AssetList from "./AssetList";
import { usdcAddress } from "../../generated/contracts";
import Text from "../shared/Text";

export default function Balance() {
  const [isOpen, setIsOpen] = useState(false);
  const { address } = useAccount();
  const { data: balance } = useBalance({ token: usdcAddress, address });

  const onPress = () => {
    setIsOpen(!isOpen);
  };

  return (
    <View display="flex" gap={ms(20)}>
      <View display="flex" flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text
          fontSize={15}
          lineHeight={21}
          fontWeight="bold"
          color="$uiNeutralSecondary"
          textAlign="center"
          width="100%"
        >
          Balance
        </Text>
      </View>
      <View display="flex" gap={ms(10)}>
        <Pressable onPress={onPress}>
          <View flexDirection="row" justifyContent="center" alignItems="center" gap={ms(10)}>
            <Text fontFamily="$mono" fontSize={ms(40)} fontWeight="bold">
              {balance ? balance.formatted : "0.00"} {balance?.symbol}
            </Text>
            <ButtonIcon>
              {isOpen ? (
                <ChevronUp size={ms(32)} color="$uiBrandSecondary" fontWeight="bold" />
              ) : (
                <ChevronDown size={ms(32)} color="$uiBrandSecondary" fontWeight="bold" />
              )}
            </ButtonIcon>
          </View>
        </Pressable>
        <AssetChange />
      </View>
      {isOpen && <AssetList />}
    </View>
  );
}
