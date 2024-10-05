import { ArrowRight } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { Image, ScrollView, XStack, YStack } from "tamagui";

import type { Withdraw } from "../../utils/queryClient";
import type { WithdrawDetails } from "./Withdraw";

import assetLogos from "../../utils/assetLogos";
import shortenAddress from "../../utils/shortenAddress";
import AssetLogo from "../shared/AssetLogo";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

interface ReviewProperties {
  canSend: boolean;
  details: WithdrawDetails;
  isFirstSend: boolean;
  onSend: () => void;
}

export default function Review({
  canSend,
  details: { amount, assetName, usdValue },
  isFirstSend,
  onSend,
}: ReviewProperties) {
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const { canGoBack } = router;
  return (
    <>
      <View alignItems="center">
        <Text callout color="$uiNeutralPrimary" emphasized>
          Review transaction
        </Text>
      </View>
      <ScrollView>
        <View gap="$s5" padded>
          <YStack gap="$s4">
            <Text color="$uiNeutralSecondary" emphasized footnote>
              Sending
            </Text>
            <XStack alignItems="center" gap="$s3">
              <AssetLogo height={ms(40)} uri={assetLogos[assetName as keyof typeof assetLogos]} width={ms(40)} />
              <YStack>
                <Text color="$uiNeutralPrimary" title>
                  {amount} {assetName}
                </Text>
                <Text color="$uiNeutralSecondary" subHeadline>
                  {Number(usdValue).toLocaleString(undefined, {
                    currency: "USD",
                    maximumFractionDigits: 2,
                    minimumFractionDigits: 2,
                    style: "currency",
                  })}
                </Text>
              </YStack>
            </XStack>
          </YStack>
          <YStack gap="$s4">
            <Text color="$uiNeutralSecondary" emphasized footnote>
              To
            </Text>
            <XStack alignItems="center" gap="$s3">
              <Image backgroundColor="$backgroundBrand" borderRadius="$r_0" height={ms(40)} width={ms(40)} />
              <YStack>
                <Text color="$uiNeutralPrimary" title>
                  {shortenAddress(withdraw?.receiver ?? "", 5, 5)}
                </Text>
                {isFirstSend && (
                  <Text color="$uiNeutralSecondary" subHeadline>
                    First time send
                  </Text>
                )}
              </YStack>
            </XStack>
          </YStack>
          <Button
            contained
            disabled={!canSend}
            iconAfter={<ArrowRight color={canSend ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"} />}
            main
            onPress={onSend}
            spaced
          >
            Send
          </Button>
        </View>
        <View alignItems="center" padded>
          {canGoBack() && (
            <Pressable
              onPress={() => {
                router.back();
              }}
            >
              <Text color="$interactiveBaseBrandDefault" emphasized footnote>
                Close
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </>
  );
}
