import shortenHex from "@exactly/common/shortenHex";
import { ArrowRight } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Pressable, Image } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, XStack, YStack, Image as TamaguiImage } from "tamagui";

import type { WithdrawDetails } from "./Withdraw";
import assetLogos from "../../utils/assetLogos";
import type { Withdraw } from "../../utils/queryClient";
import useAsset from "../../utils/useAsset";
import AssetLogo from "../shared/AssetLogo";
import Button from "../shared/Button";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Review({
  details: { amount, usdValue, assetName },
  canSend,
  isFirstSend,
  onSend,
}: {
  canSend: boolean;
  details: WithdrawDetails;
  isFirstSend: boolean;
  onSend: () => void;
}) {
  const { data: withdraw } = useQuery<Withdraw>({ queryKey: ["withdrawal"] });
  const { market, externalAsset } = useAsset(withdraw?.market);
  const { canGoBack } = router;
  return (
    <>
      <View alignItems="center">
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
              {market && (
                <AssetLogo uri={assetLogos[assetName as keyof typeof assetLogos]} width={ms(40)} height={ms(40)} />
              )}
              {externalAsset && (
                <Image
                  source={{ uri: externalAsset.logoURI }}
                  width={ms(40)}
                  height={ms(40)}
                  style={{ borderRadius: ms(20) }}
                />
              )}
              <YStack flex={1}>
                <Text title color="$uiNeutralPrimary">
                  {amount} {assetName}
                </Text>
                <Text subHeadline color="$uiNeutralSecondary">
                  {Number(usdValue).toLocaleString(undefined, {
                    style: "currency",
                    currency: "USD",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
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
              <TamaguiImage backgroundColor="$backgroundBrand" width={ms(40)} height={ms(40)} borderRadius="$r_0" />
              <YStack>
                <Text title color="$uiNeutralPrimary" fontFamily="$mono">
                  {shortenHex(withdraw?.receiver ?? "")}
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
