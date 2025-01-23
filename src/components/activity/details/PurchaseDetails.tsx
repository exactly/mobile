import shortenHex from "@exactly/common/shortenHex";
import type { CreditActivity, DebitActivity, InstallmentsActivity } from "@exactly/server/api/activity";
import { Copy } from "@tamagui/lucide-icons";
import { useToastController } from "@tamagui/toast";
import { format } from "date-fns";
import { setStringAsync } from "expo-clipboard";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Separator, XStack, YStack } from "tamagui";

import handleError from "../../../utils/handleError";
import Text from "../../shared/Text";

export default function PurchaseDetails({ item }: { item: CreditActivity | DebitActivity | InstallmentsActivity }) {
  const toast = useToastController();
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
            Amount
          </Text>
          <Text callout color="$uiNeutralPrimary">
            {Number(item.amount).toLocaleString(undefined, { maximumFractionDigits: 8, minimumFractionDigits: 0 })}
            &nbsp;{item.currency}
          </Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            ID
          </Text>
          <Pressable
            onPress={() => {
              setStringAsync(item.id).catch(handleError);
              toast.show("Operation ID copied!", {
                native: true,
                duration: 1000,
                burntOptions: { haptic: "success" },
              });
            }}
            hitSlop={ms(15)}
          >
            <XStack gap="$s3">
              <Text callout color="$uiNeutralPrimary">
                {shortenHex(item.id)}
              </Text>
              <Copy size={ms(20)} color="$uiNeutralPrimary" />
            </XStack>
          </Pressable>
        </XStack>
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Exchange rate
          </Text>
          <Text callout color="$uiNeutralPrimary">
            1 USD&nbsp;=&nbsp;
            {Number(item.amount / item.usdAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            &nbsp;{item.currency}
          </Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Date
          </Text>
          <Text callout color="$uiNeutralPrimary">
            {format(item.timestamp, "yyyy-MM-dd")}
          </Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Time
          </Text>
          <Text callout color="$uiNeutralPrimary">
            {format(item.timestamp, "HH:mm:ss")}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}
