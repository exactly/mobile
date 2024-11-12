import type { CreditActivity, DebitActivity, InstallmentsActivity } from "@exactly/server/api/activity";
import { setStringAsync } from "expo-clipboard";
import React from "react";
import { Alert } from "react-native";
import { ms } from "react-native-size-matters";
import { Separator, XStack, YStack } from "tamagui";

import handleError from "../../../utils/handleError";
import shortenAddress from "../../../utils/shortenAddress";
import Text from "../../shared/Text";

export default function OperationDetails({ item }: { item: CreditActivity | DebitActivity | InstallmentsActivity }) {
  return (
    <YStack gap="$s4">
      <YStack gap="$s4">
        <Text emphasized headline>
          Purchase details
        </Text>
        <Separator height={1} borderColor="$borderNeutralSoft" />
      </YStack>
      <YStack gap="$s3_5">
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Total
          </Text>
          <Text callout color="$uiNeutralPrimary">
            {Number(item.usdAmount).toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              currencyDisplay: "narrowSymbol",
            })}
          </Text>
        </XStack>

        {item.mode !== 0 && (
          <XStack justifyContent="space-between">
            <Text emphasized footnote color="$uiNeutralSecondary">
              Installments
            </Text>
            <Text emphasized callout color="$uiNeutralPrimary">
              {item.mode === 1 && `1x ${Number(item.amount + item.borrow.fee).toFixed(2)}`}
              {item.mode > 1 && `${(item as InstallmentsActivity).borrow.installments.length}x`}&nbsp;
              {item.mode > 1 &&
                Number(item.amount / (item as InstallmentsActivity).borrow.installments.length).toFixed(2)}
              &nbsp;{item.currency}
            </Text>
          </XStack>
        )}

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

        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            ID
          </Text>
          <Text
            callout
            color="$uiNeutralPrimary"
            onPress={() => {
              setStringAsync(item.id).catch(handleError);
              Alert.alert("Copied!", "The operation ID has been copied to the clipboard.");
            }}
            hitSlop={ms(15)}
          >
            {shortenAddress(item.id, 8, 8)}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}
