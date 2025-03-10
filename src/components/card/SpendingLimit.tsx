import React from "react";
import { ms } from "react-native-size-matters";
import { View, XStack, YStack } from "tamagui";

import Text from "../shared/Text";

export default function SpendingLimit({ title, limit }: { amount?: number; title: string; limit: number }) {
  return (
    <YStack justifyContent="flex-start" paddingHorizontal="$s3">
      <XStack flexDirection="row" flex={1} height={ms(46)} alignItems="center" justifyContent="space-between">
        <View flexDirection="row" gap={ms(5)} alignItems="center">
          <Text emphasized callout>
            {title}
          </Text>
          <Text callout color="$uiNeutralSecondary">
            →
          </Text>
          <Text callout sensitive color="$uiNeutralSecondary">
            {limit.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
              maximumFractionDigits: 0,
            })}
          </Text>
        </View>
      </XStack>
      <View width="100%" height={ms(8)} borderRadius="$r_0" backgroundColor="$uiBrandSecondary" />
    </YStack>
  );
}
