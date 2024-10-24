import type { Passkey } from "@exactly/common/validation";
import { ArrowRight, ChevronRight, IdCard } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { PixelRatio, Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { XStack, YStack } from "tamagui";

import handleError from "../../utils/handleError";
import { verifyIdentity } from "../../utils/persona";
import queryClient from "../../utils/queryClient";
import Text from "../shared/Text";
import View from "../shared/View";

export default function GettingStarted({ hasFunds }: { hasFunds: boolean }) {
  const completedSteps = hasFunds ? 2 : 1;
  const { data: passkey } = useQuery<Passkey>({ queryKey: ["passkey"] });
  const { mutateAsync: startKYC } = useMutation({
    mutationKey: ["kyc"],
    mutationFn: async () => {
      if (!passkey) throw new Error("missing passkey");
      await verifyIdentity(passkey);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["kyc", "status"] });
    },
  });

  function handleViewAll() {
    router.push({
      pathname: "/getting-started",
      params: { step: hasFunds ? "verify-identity" : "add-funds" },
    });
  }

  function handleStep() {
    if (hasFunds) {
      startKYC().catch(handleError);
    } else {
      router.push({ pathname: "/add-funds/add-crypto" });
    }
  }

  return (
    <YStack backgroundColor="$backgroundBrandSoft" borderWidth={1} borderColor="$borderBrandSoft" borderRadius="$r3">
      <XStack justifyContent="space-between" alignItems="center" padding="$s4">
        <Text emphasized headline color="$uiBrandSecondary" maxFontSizeMultiplier={1.3}>
          Getting Started
        </Text>
        <Pressable hitSlop={ms(15)}>
          <XStack gap={2} alignItems="center">
            <Pressable hitSlop={ms(15)} onPress={handleViewAll}>
              <Text emphasized footnote color="$interactiveBaseBrandDefault">
                View all steps
              </Text>
            </Pressable>
            <ChevronRight size={ms(14) * PixelRatio.getFontScale()} color="$interactiveTextBrandDefault" />
          </XStack>
        </Pressable>
      </XStack>
      <XStack justifyContent="space-between" alignItems="center" padding="$s4">
        <YStack gap="$s3">
          <XStack gap="$s3" alignItems="center">
            <IdCard size={ms(24) * PixelRatio.getFontScale()} color="$uiBrandSecondary" />
            <Text emphasized headline color="$uiBrandSecondary" maxFontSizeMultiplier={1.3}>
              {hasFunds ? "Verify your identity" : "Add funds to account"}
            </Text>
          </XStack>
          <XStack gap="$s3_5" alignItems="center">
            <XStack alignItems="center" gap="$s2">
              {Array.from({ length: 3 }).map((_, index) => (
                <View
                  key={index}
                  backgroundColor={completedSteps > index ? "$interactiveBaseBrandDefault" : "$uiBrandTertiary"}
                  width={ms(24)}
                  height={8}
                  borderRadius="$r_0"
                />
              ))}
            </XStack>
            <Text emphasized subHeadline color="$uiBrandTertiary">
              {completedSteps}/3
            </Text>
          </XStack>
        </YStack>
        <Pressable hitSlop={ms(15)} onPress={handleStep}>
          <View
            width={ms(44)}
            height={ms(44)}
            backgroundColor="$interactiveBaseBrandDefault"
            borderRadius="$r3"
            justifyContent="center"
            alignItems="center"
          >
            <ArrowRight size={ms(24) * PixelRatio.getFontScale()} color="$interactiveOnBaseBrandDefault" />
          </View>
        </Pressable>
      </XStack>
    </YStack>
  );
}
