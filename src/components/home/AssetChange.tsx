import { TrendUp } from "phosphor-react-native";
import React from "react";
import { View, Text, useTheme } from "tamagui";

const AssetChange = () => {
  const theme = useTheme();
  return (
    <View display="flex" flexDirection="row" alignItems="center" justifyContent="center" gap={5}>
      <TrendUp size={20} color={theme.uiSuccessSecondary.val as string} weight="bold" />
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
        color="$uiSuccessSecondary"
      >
        7D
      </Text>
    </View>
  );
};

export default AssetChange;
