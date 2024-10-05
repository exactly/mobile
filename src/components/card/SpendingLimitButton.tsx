import React from "react";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";

import Text from "../shared/Text";

interface SpendingLimitButtonProperties {
  amount?: number;
  limit: number;
  title: string;
}

export default function SpendingLimitButton({ limit, title }: SpendingLimitButtonProperties) {
  return (
    <View
      alignItems="center"
      backgroundColor="$backgroundBrandSoft"
      borderRadius="$r3"
      flex={1}
      flexDirection="row"
      height={ms(46)}
    >
      <View
        backgroundColor="$interactiveBaseBrandDefault"
        borderBottomRightRadius="$r0"
        borderRadius="$r3"
        borderTopRightRadius="$r0"
        height={ms(46)}
        opacity={0.1}
        position="absolute"
        width="0%"
      />

      <View flex={1} flexDirection="row" justifyContent="space-between" padding="$s3">
        <View alignItems="center" flexDirection="row" gap={ms(5)}>
          <Text fontSize={ms(15)}>{title}</Text>
        </View>
        <View alignItems="center" flexDirection="row" gap={ms(5)} justifyContent="space-around">
          <Text color="$uiBrandSecondary" fontSize={ms(15)} sensitive>
            {limit.toLocaleString(undefined, {
              currency: "USD",
              currencyDisplay: "narrowSymbol",
              maximumFractionDigits: 0,
              style: "currency",
            })}
          </Text>
        </View>
      </View>
    </View>
  );
}
