import React from "react";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";

import Text from "../shared/Text";

interface SpendingLimitButtonProperties {
  amount?: number;
  title: string;
  limit: number;
}

export default function SpendingLimitButton({ title, limit }: SpendingLimitButtonProperties) {
  return (
    <View
      flexDirection="row"
      flex={1}
      backgroundColor="$backgroundBrandSoft"
      borderRadius="$r3"
      height={ms(46)}
      alignItems="center"
    >
      <View
        position="absolute"
        width="0%"
        height={ms(46)}
        backgroundColor="$interactiveBaseBrandDefault"
        borderRadius="$r3"
        borderTopRightRadius="$r0"
        borderBottomRightRadius="$r0"
        opacity={0.1}
      />

      <View flexDirection="row" justifyContent="space-between" flex={1} padding="$s3">
        <View flexDirection="row" gap={ms(5)} alignItems="center">
          <Text fontSize={ms(15)}>{title}</Text>
        </View>
        <View flexDirection="row" justifyContent="space-around" alignItems="center" gap={ms(5)}>
          <Text color="$uiBrandSecondary" fontSize={ms(15)}>
            {limit.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}
          </Text>
        </View>
      </View>
    </View>
  );
}
