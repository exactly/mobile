import type { CreditActivity, DebitActivity, InstallmentsActivity } from "@exactly/server/api/activity";
import { CircleDollarSign } from "@tamagui/lucide-icons";
import React from "react";
import { ms } from "react-native-size-matters";
import { Square, XStack, YStack } from "tamagui";

import OperationDetails from "./OperationDetails";
import Text from "../../shared/Text";

export default function CardActivity({ item }: { item: CreditActivity | DebitActivity | InstallmentsActivity }) {
  const { amount, usdAmount, currency } = item;
  return (
    <>
      <YStack gap="$s7" paddingBottom="$s9">
        <XStack justifyContent="center" alignItems="center">
          <Square borderRadius="$r4" backgroundColor="$backgroundStrong" size={ms(80)}>
            <CircleDollarSign size={ms(48)} color="$uiNeutralPrimary" strokeWidth={2} />
          </Square>
        </XStack>
        <YStack gap="$s4_5" justifyContent="center" alignItems="center">
          <Text secondary body>
            Paid
            <Text emphasized primary body>
              &nbsp;
              {item.merchant.name}
            </Text>
          </Text>
          <Text title primary color="$uiNeutralPrimary">
            {Number(usdAmount).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
            })}
          </Text>
          <XStack gap="$s3" alignItems="center">
            <Text emphasized subHeadline color="$uiNeutralSecondary">
              {Number(amount).toLocaleString(undefined, { maximumFractionDigits: 8, minimumFractionDigits: 0 })}
              &nbsp;
              {currency}
            </Text>
          </XStack>
        </YStack>
      </YStack>
      <YStack flex={1} gap="$s7">
        <OperationDetails item={item} />
      </YStack>
    </>
  );
}
