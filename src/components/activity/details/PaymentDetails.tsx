import type { CreditActivity, DebitActivity, InstallmentsActivity } from "@exactly/server/api/activity";
import React from "react";
import { Separator, XStack, YStack } from "tamagui";

import Text from "../../shared/Text";

export default function PaymentDetails({ item }: { item: CreditActivity | DebitActivity | InstallmentsActivity }) {
  return (
    <YStack gap="$s4">
      <YStack gap="$s4">
        <Text emphasized headline>
          Payment details
        </Text>
        <Separator height={1} borderColor="$borderNeutralSoft" />
      </YStack>
      <YStack gap="$s3_5">
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Card mode
          </Text>
          <Text callout color={item.mode > 0 ? "$cardCreditInteractive" : "$cardDebitInteractive"}>
            {item.mode > 0 ? "Credit" : "Debit"}
          </Text>
        </XStack>
        {item.mode > 0 && (
          <XStack justifyContent="space-between">
            <Text emphasized footnote color="$uiNeutralSecondary">
              Fixed rate APR
            </Text>
            <Text callout color="$uiNeutralPrimary">
              {Number(item.mode > 0 && (item as CreditActivity).borrow.rate).toLocaleString(undefined, {
                style: "percent",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </XStack>
        )}
        {item.mode !== 0 && (
          <XStack justifyContent="space-between">
            <Text emphasized footnote color="$uiNeutralSecondary">
              Installments
            </Text>
            <XStack alignItems="center">
              <Text emphasized callout color="$uiNeutralPrimary">
                {item.mode === 1 && `1x`}
                {item.mode > 1 && `${(item as InstallmentsActivity).borrow.installments.length}x`}
                &nbsp;
              </Text>
              <Text callout color="$uiNeutralPrimary">
                {item.mode === 1 && Number(item.usdAmount + item.borrow.fee).toFixed(2)}
                {item.mode > 1 &&
                  Number(item.usdAmount / (item as InstallmentsActivity).borrow.installments.length).toFixed(2)}
                &nbsp;USDC
              </Text>
            </XStack>
          </XStack>
        )}
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Total
          </Text>
          <Text callout color="$uiNeutralPrimary">
            {`${Number(item.usdAmount).toLocaleString()} USDC`}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}
