import { IdCard, ArrowUpToLine, CreditCard } from "@tamagui/lucide-icons";
import React from "react";
import { StyleSheet } from "react-native";
import { XStack, YStack } from "tamagui";

import ExaCard from "../../../assets/images/exa-card.svg";
import Button from "../../shared/Button";
import Text from "../../shared/Text";
import View from "../../shared/View";

export default function Intro({ onPress }: { onPress: () => void }) {
  return (
    <View fullScreen flex={1} gap="$s7">
      <YStack flex={1} paddingHorizontal="$s6" gap="$s7">
        <YStack flex={1} justifyContent="center" gap="$s3_5">
          <View width="100%" aspectRatio={1.2} justifyContent="center" alignItems="center">
            <View width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
              <ExaCard width="100%" height="100%" />
            </View>
          </View>
          <YStack gap="$s5">
            <Text emphasized textAlign="center" color="$interactiveTextBrandDefault" title>
              Upgrade to your new Exa Card
            </Text>
            <Text color="$uiNeutralPlaceholder" footnote textAlign="center">
              Upgrade your Exa Card in 3 steps to keep spending seamlessly. Your current card works until June 21st,
              2025, but upgrading will be required after that.
            </Text>
          </YStack>
        </YStack>
        <YStack gap="$s3_5">
          <XStack gap="$s3" alignItems="center" justifyContent="center">
            <IdCard strokeWidth={2.5} color="$uiBrandSecondary" />
            <Text color="$uiBrandSecondary" emphasized headline>
              Verify your identity
            </Text>
          </XStack>
          <XStack gap="$s3" alignItems="center" justifyContent="center">
            <ArrowUpToLine strokeWidth={2.5} color="$uiBrandSecondary" />
            <Text color="$uiBrandSecondary" emphasized headline>
              Upgrade your account
            </Text>
          </XStack>
          <XStack gap="$s3" alignItems="center" justifyContent="center">
            <CreditCard strokeWidth={2.5} color="$uiBrandSecondary" />
            <Text color="$uiBrandSecondary" emphasized headline>
              Activate your new Exa Card
            </Text>
          </XStack>
        </YStack>
      </YStack>
      <YStack paddingHorizontal="$s5" paddingBottom="$s7">
        <Button
          onPress={onPress}
          flexBasis={60}
          contained
          main
          spaced
          fullwidth
          iconAfter={<IdCard strokeWidth={2.5} color="$interactiveOnBaseBrandDefault" />}
        >
          Verify your identity
        </Button>
      </YStack>
    </View>
  );
}
