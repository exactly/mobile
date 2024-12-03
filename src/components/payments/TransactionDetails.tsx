import chain from "@exactly/common/generated/chain";
import shortenHex from "@exactly/common/shortenHex";
import { SquareArrowOutUpRight } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import { openBrowserAsync } from "expo-web-browser";
import React from "react";
import { ms } from "react-native-size-matters";
import { Separator, XStack, YStack } from "tamagui";

import OptimismImage from "../../assets/images/optimism.svg";
import handleError from "../../utils/handleError";
import Text from "../shared/Text";

export default function TransactionDetails({ transactionHash }: { transactionHash: string }) {
  return (
    <YStack gap="$s4">
      <YStack gap="$s4">
        <Text emphasized headline>
          Transaction details
        </Text>
        <Separator height={1} borderColor="$borderNeutralSoft" />
      </YStack>
      <YStack gap="$s3_5">
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Network fee
          </Text>
          <Text callout color="$uiSuccessSecondary">
            FREE
          </Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Network
          </Text>
          <XStack gap="$s3" alignItems="center">
            <Text callout color="$uiNeutralPrimary" alignContent="center">
              {chain.name}
            </Text>
            <OptimismImage height={ms(20)} width={ms(20)} />
          </XStack>
        </XStack>
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Date
          </Text>
          <Text callout color="$uiNeutralPrimary">
            {format(new Date(), "yyyy-MM-dd")}
          </Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Time
          </Text>
          <Text callout color="$uiNeutralPrimary">
            {format(new Date(), "HH:mm:ss")}
          </Text>
        </XStack>
        <XStack justifyContent="space-between">
          <Text emphasized footnote color="$uiNeutralSecondary">
            Transaction hash
          </Text>
          <XStack
            alignItems="center"
            gap="$s3"
            onPress={() => {
              openBrowserAsync(`${chain.blockExplorers?.default.url}/tx/${transactionHash}`).catch(handleError);
            }}
          >
            <Text textDecorationLine="underline" callout color="$uiNeutralPrimary">
              {shortenHex(transactionHash)}
            </Text>
            <SquareArrowOutUpRight size={ms(20)} color="$uiNeutralSecondary" />
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
}
