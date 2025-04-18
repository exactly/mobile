import shortenHex from "@exactly/common/shortenHex";
import type { WithdrawActivity } from "@exactly/server/api/activity";
import { ArrowUpFromLine } from "@tamagui/lucide-icons";
import React from "react";
import { Square, XStack, YStack } from "tamagui";

import TransactionDetails from "./TransactionDetails";
import assetLogos from "../../../utils/assetLogos";
import AssetLogo from "../../shared/AssetLogo";
import Text from "../../shared/Text";

// TODO review prop type
export default function SentActivity({ item }: { item: Omit<WithdrawActivity, "blockNumber"> }) {
  const { amount, usdAmount, currency } = item;
  return (
    <>
      <YStack gap="$s7" paddingBottom="$s9">
        <XStack justifyContent="center" alignItems="center">
          <Square borderRadius="$r4" backgroundColor="$backgroundStrong" size={80}>
            <ArrowUpFromLine size={48} color="$interactiveOnBaseErrorSoft" strokeWidth={2} />
          </Square>
        </XStack>
        <YStack gap="$s4_5" justifyContent="center" alignItems="center">
          <Text secondary body>
            Sent to
            <Text emphasized primary body>
              &nbsp;
              {shortenHex(item.receiver)}
            </Text>
          </Text>
          <Text title primary color="$uiErrorSecondary">
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
            <AssetLogo uri={assetLogos[currency as keyof typeof assetLogos]} width={16} height={16} />
          </XStack>
        </YStack>
      </YStack>
      <YStack flex={1} gap="$s7">
        <TransactionDetails />
      </YStack>
    </>
  );
}
