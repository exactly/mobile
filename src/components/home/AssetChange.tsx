import { TrendingUp } from "@tamagui/lucide-icons";
import React from "react";
import { View, Text } from "tamagui";

export default function AssetChange() {
  return (
    <View display="flex" flexDirection="row" alignItems="center" justifyContent="center" gap={5}>
      <TrendingUp size={20} color="$uiSuccessSecondary" fontWeight="bold" />
      <Text
        fontSize={15}
        fontFamily="$mono"
        lineHeight={21}
        fontWeight="bold"
        textAlign="center"
        color="$uiSuccessSecondary"
      >
        Change
      </Text>
      <Text
        fontSize={15}
        fontFamily="$mono"
        lineHeight={21}
        fontWeight="bold"
        textAlign="center"
        color="$uiSuccessSecondary"
      >
        (2.94%)
      </Text>
      <Text
        fontSize={15}
        fontFamily="$mono"
        lineHeight={21}
        fontWeight="bold"
        textAlign="center"
        color="$uiNeutralSecondary"
      >
        7D
      </Text>
    </View>
  );
}
