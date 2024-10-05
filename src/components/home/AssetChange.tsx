import { Minus } from "@tamagui/lucide-icons";
import React from "react";
import { Text, View } from "tamagui";

export default function AssetChange() {
  return (
    <View alignItems="center" display="flex" flexDirection="row" gap={5} justifyContent="center">
      <Minus color="$uiNeutralSecondary" fontWeight="bold" size={20} />
      <Text
        color="$uiNeutralSecondary"
        fontFamily="$mono"
        fontSize={15}
        fontWeight="bold"
        lineHeight={21}
        textAlign="center"
      >
        $0
      </Text>
      <Text
        color="$uiNeutralSecondary"
        fontFamily="$mono"
        fontSize={15}
        fontWeight="bold"
        lineHeight={21}
        textAlign="center"
      >
        (0%)
      </Text>
      <Text
        color="$uiNeutralSecondary"
        fontFamily="$mono"
        fontSize={15}
        fontWeight="bold"
        lineHeight={21}
        textAlign="center"
      >
        7D
      </Text>
    </View>
  );
}
