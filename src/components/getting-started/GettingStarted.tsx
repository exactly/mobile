import type { Passkey } from "@exactly/common/validation";
import { ArrowDownToLine, ArrowLeft, Check, IdCard } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, XStack, YStack } from "tamagui";
import { literal, safeParse, union } from "valibot";

import handleError from "../../utils/handleError";
import { verifyIdentity } from "../../utils/persona";
import queryClient from "../../utils/queryClient";
import { kycStatus } from "../../utils/server";
import ActionButton from "../shared/ActionButton";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function GettingStarted() {
  const { canGoBack } = router;
  const { step } = useLocalSearchParams();
  const schema = union([literal("add-funds"), literal("verify-identity")]);
  const { success, output: currentStep } = safeParse(schema, step);

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

  const { data: KYCStatus, error: KYCStatusError } = useQuery({ queryKey: ["kyc", "status"], queryFn: kycStatus });

  function handleAction() {
    switch (currentStep) {
      case "add-funds":
        router.push({ pathname: "/add-funds/add-crypto" });
        break;
      case "verify-identity":
        startKYC().catch(handleError);
        break;
      default:
        break;
    }
  }

  if (KYCStatus && !KYCStatusError) {
    router.replace("/(home)");
    return;
  }

  const completedSteps = success ? (currentStep === "add-funds" ? 1 : 2) : 1;

  return (
    <SafeView fullScreen backgroundColor="$backgroundBrandSoft">
      <View gap={ms(20)} fullScreen>
        <View gap={ms(20)} padded paddingBottom={0}>
          <View flexDirection="row" gap={ms(10)} justifyContent="space-around" alignItems="center">
            <View position="absolute" left={0}>
              {canGoBack() && (
                <Pressable
                  onPress={() => {
                    router.back();
                  }}
                >
                  <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
                </Pressable>
              )}
            </View>
            <Text color="$uiNeutralPrimary" fontSize={ms(15)} fontWeight="bold">
              Getting started
            </Text>
          </View>
        </View>
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack gap="$s6" borderBottomWidth={1} borderBottomColor="$borderBrandSoft" padding="$s4">
            <YStack gap="$s4">
              <XStack>
                <ArrowDownToLine size={ms(32)} color="$uiBrandSecondary" />
              </XStack>
              <Text emphasized title3 color="$uiBrandSecondary">
                {completedSteps === 1 ? "Add funds to your account" : "Verify your identity"}
              </Text>
            </YStack>
            <YStack>
              <Text subHeadline color="$uiNeutralSecondary">
                {completedSteps === 1
                  ? "Your funds serve as collateral, increasing your credit and debit limits. The more funds you add, the more you can spend with the Exa Card."
                  : "Verifying your identity grants you access to our all-in-one Exa Card, enabling you to easily spend your crypto."}
              </Text>
            </YStack>
            <YStack gap="$s3_5">
              <XStack flex={1} gap="$s2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <XStack
                    key={index}
                    backgroundColor={completedSteps > index ? "$interactiveBaseBrandDefault" : "$uiBrandTertiary"}
                    height={8}
                    borderRadius="$r_0"
                    flex={1}
                  />
                ))}
              </XStack>
              <XStack justifyContent="space-between" gap="$s3">
                <Text emphasized subHeadline color="$uiBrandTertiary">
                  {completedSteps === 1 ? "Two steps left" : "One step left"}
                </Text>
                <Text emphasized subHeadline color="$uiBrandTertiary">
                  {completedSteps}/3
                </Text>
              </XStack>
            </YStack>
            <YStack>
              <ActionButton
                marginTop="$s4"
                marginBottom="$s5"
                onPress={handleAction}
                iconAfter={
                  completedSteps === 1 ? (
                    <ArrowDownToLine size={20} color="$interactiveOnBaseBrandDefault" strokeWidth={2} />
                  ) : (
                    <IdCard size={20} color="$interactiveOnBaseBrandDefault" strokeWidth={2} />
                  )
                }
              >
                {completedSteps === 1 ? "Add funds" : "Begin verifying"}
              </ActionButton>
            </YStack>
          </YStack>
          <YStack
            backgroundColor="$backgroundSoft"
            paddingHorizontal="$s5"
            paddingVertical="$s7"
            gap="$s6"
            height="100%"
          >
            <YStack gap="$s4">
              <Text emphasized headline primary>
                Remaining steps
              </Text>
              <Text footnote secondary>
                You are almost set to start using the Exa Card.
              </Text>
            </YStack>
            <YStack gap="$s4">
              <XStack
                backgroundColor="$interactiveBaseSuccessSoftDefault"
                alignItems="center"
                padding="$s4_5"
                borderRadius="$r3"
                borderWidth={1}
                borderColor="$borderSuccessSoft"
                gap="$s3_5"
              >
                <View
                  width={24}
                  height={24}
                  borderRadius="$r_0"
                  backgroundColor="$uiSuccessSecondary"
                  borderWidth={2}
                  borderColor="$uiSuccessTertiary"
                  alignItems="center"
                  justifyContent="center"
                  padding="$s2"
                >
                  <Check size={14} strokeWidth={4} color="$interactiveOnBaseSuccessDefault" />
                </View>
                <Text emphasized subHeadline color="$uiBrandSecondary">
                  Account created
                </Text>
              </XStack>

              {completedSteps === 1 ? (
                <XStack
                  backgroundColor="$backgroundSoft"
                  alignItems="center"
                  padding="$s4_5"
                  borderRadius="$r3"
                  borderWidth={1}
                  borderColor="$borderNeutralSoft"
                  gap="$s3_5"
                >
                  <ArrowDownToLine size={20} strokeWidth={2} color="$uiBrandSecondary" />
                  <YStack gap="$s4_5" flex={1}>
                    <YStack gap="$s3_5">
                      <Text emphasized subHeadline primary>
                        Add funds to your account
                      </Text>
                      <Text footnote secondary>
                        Your funds serve as collateral, increasing your credit and debit limits.
                      </Text>
                    </YStack>
                    <Pressable hitSlop={ms(15)}>
                      <Text emphasized footnote color="$interactiveBaseBrandDefault">
                        Learn more about collateral
                      </Text>
                    </Pressable>
                  </YStack>
                </XStack>
              ) : (
                <XStack
                  backgroundColor="$interactiveBaseSuccessSoftDefault"
                  alignItems="center"
                  padding="$s4_5"
                  borderRadius="$r3"
                  borderWidth={1}
                  borderColor="$borderSuccessSoft"
                  gap="$s3_5"
                >
                  <View
                    width={24}
                    height={24}
                    borderRadius="$r_0"
                    backgroundColor="$uiSuccessSecondary"
                    borderWidth={2}
                    borderColor="$uiSuccessTertiary"
                    alignItems="center"
                    justifyContent="center"
                    padding="$s2"
                  >
                    <Check size={14} strokeWidth={4} color="$interactiveOnBaseSuccessDefault" />
                  </View>
                  <Text emphasized subHeadline color="$uiBrandSecondary">
                    Add funds to your account
                  </Text>
                </XStack>
              )}

              <XStack
                backgroundColor="$backgroundSoft"
                alignItems="center"
                padding="$s4_5"
                borderRadius="$r3"
                borderWidth={1}
                borderColor="$borderNeutralSoft"
                gap="$s3_5"
              >
                <IdCard size={20} strokeWidth={2} color="$uiBrandSecondary" />
                <YStack gap="$s4_5" flex={1}>
                  <YStack gap="$s3_5">
                    <Text emphasized subHeadline primary>
                      Verify your identity
                    </Text>
                    <Text footnote secondary>
                      To enable the Exa Card we need to verify your identity.
                    </Text>
                  </YStack>
                  <Pressable hitSlop={ms(15)}>
                    <Text emphasized footnote color="$interactiveBaseBrandDefault">
                      Learn more about the KYC process
                    </Text>
                  </Pressable>
                </YStack>
              </XStack>
            </YStack>
          </YStack>
        </ScrollView>
      </View>
    </SafeView>
  );
}
