import { ArrowRight } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, XStack, YStack, Image } from "tamagui";

import assetLogos from "../../utils/assetLogos";
import type { Withdraw } from "../../utils/queryClient";
import shortenAddress from "../../utils/shortenAddress";
import AssetLogo from "../shared/AssetLogo";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

interface ReviewProperties {
  canSend: boolean;
  details: { assetName?: string; amount: bigint; usdValue: bigint };
  isFirstSend: boolean;
  onSend: () => void;
}

export default function Review({
  details: { amount, usdValue, assetName },
  canSend,
  isFirstSend,
  onSend,
}: ReviewProperties) {
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const { canGoBack } = router;
  return (
    <>
      <View padded alignItems="center">
        <Text emphasized callout color="$uiNeutralPrimary">
          Review transaction
        </Text>
      </View>
      <ScrollView>
        <View padded gap="$s5">
          <YStack gap="$s4">
            <Text emphasized footnote color="$uiNeutralSecondary">
              Sending
            </Text>
            <XStack alignItems="center" gap="$s3">
              <AssetLogo uri={assetLogos[assetName as keyof typeof assetLogos]} width={ms(40)} height={ms(40)} />
              <YStack>
                <Text title color="$uiNeutralPrimary">
                  {(Number(amount) / 1e18).toString()}
                </Text>
                <Text subHeadline color="$uiNeutralSecondary">
                  {(Number(usdValue) / 1e18).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    currencyDisplay: "narrowSymbol",
                  })}
                </Text>
              </YStack>
            </XStack>
          </YStack>
          <YStack gap="$s4">
            <Text emphasized footnote color="$uiNeutralSecondary">
              To
            </Text>
            <XStack alignItems="center" gap="$s3">
              <Image backgroundColor="$backgroundBrand" width={ms(40)} height={ms(40)} borderRadius="$r_0" />
              <YStack>
                <Text title color="$uiNeutralPrimary">
                  {shortenAddress(withdraw?.receiver ?? "", 5, 5)}
                </Text>
                {isFirstSend && (
                  <Text subHeadline color="$uiNeutralSecondary">
                    First time send
                  </Text>
                )}
              </YStack>
            </XStack>
          </YStack>
          <Button
            contained
            main
            spaced
            disabled={!canSend}
            iconAfter={<ArrowRight color={canSend ? "$interactiveOnBaseBrandDefault" : "$interactiveOnDisabled"} />}
            onPress={onSend}
          >
            Send
          </Button>
        </View>
        <View padded alignItems="center">
          {canGoBack() && (
            <Pressable
              onPress={() => {
                router.back();
              }}
            >
              <Text emphasized footnote color="$interactiveBaseBrandDefault">
                Close
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </>
  );
}
