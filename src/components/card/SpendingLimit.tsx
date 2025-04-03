import React from "react";
import { View, XStack, YStack } from "tamagui";

import Text from "../shared/Text";

export default function SpendingLimit({ title, limit }: { amount?: number; title: string; limit: number }) {
  return (
    <YStack justifyContent="flex-start" paddingHorizontal="$s3">
      <XStack flexDirection="row" flex={1} height={46} alignItems="center" justifyContent="space-between">
        <View flexDirection="row" gap={5} alignItems="center">
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
      <View width="100%" height={8} borderRadius="$r_0" backgroundColor="$uiBrandSecondary" />
    </YStack>
  );
}
