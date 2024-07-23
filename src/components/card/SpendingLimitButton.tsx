import { PencilLine } from "phosphor-react-native";
import React from "react";
import { ms } from "react-native-size-matters";
import { View, Text, useTheme } from "tamagui";

interface SpendingLimitButtonProperties {
  title: string;
  amount: number;
  limit: number;
  currency?: string;
}

export default function SpendingLimitButton({ title, amount, limit, currency }: SpendingLimitButtonProperties) {
  const theme = useTheme();
  return (
    <View
      flexDirection="row"
      flex={1}
      backgroundColor="$backgroundBrandSoft"
      width="100%"
      borderRadius="$r3"
      height={ms(46)}
      alignItems="center"
    >
      <View
        position="absolute"
        width="70%"
        height={ms(46)}
        backgroundColor="$interactiveBaseBrandDefault"
        borderRadius="$r3"
        borderTopRightRadius="$r0"
        borderBottomRightRadius="$r0"
        opacity={0.1}
      />

      <View flexDirection="row" justifyContent="space-between" flex={1}>
        <View flexDirection="row" gap={ms(5)} alignItems="center" padding={ms(10)}>
          <Text color="$uiprimary" fontSize={ms(15)}>
            {title}
          </Text>
          <PencilLine size={ms(15)} color={theme.iconPrimary.get()} />
        </View>
        <View flexDirection="row" justifyContent="space-around" alignItems="center" gap={ms(5)}>
          <Text color="$uiBrandSecondary" fontSize={ms(15)} fontWeight="bold">
            {currency}
            {amount}
          </Text>
          <Text color="$uiBrandSecondary" fontSize={ms(15)}>
            /
          </Text>
          <Text color="$uiBrandSecondary" fontSize={ms(15)}>
            {currency}
            {limit}
          </Text>
        </View>
      </View>
    </View>
  );
}
