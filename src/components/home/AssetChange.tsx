import { Minus } from "@tamagui/lucide-icons";
import React from "react";
import { View, Text } from "tamagui";

export default function AssetChange() {
  return (
    <View display="flex" flexDirection="row" alignItems="center" justifyContent="center" gap={5}>
      <Minus size={20} color="$uiNeutralSecondary" fontWeight="bold" />
      <Text
        fontSize={15}
        fontFamily="$mono"
        lineHeight={21}
        fontWeight="bold"
        textAlign="center"
        color="$uiNeutralSecondary"
      >
        $0
      </Text>
      <Text
        fontSize={15}
        fontFamily="$mono"
        lineHeight={21}
        fontWeight="bold"
        textAlign="center"
        color="$uiNeutralSecondary"
      >
        (0%)
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
