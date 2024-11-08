import type { Passkey } from "@exactly/common/validation";
import { ArrowDownToLine, ArrowLeft, Check, IdCard } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useContext } from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, XStack, YStack } from "tamagui";

import Step from "./Step";
import handleError from "../../utils/handleError";
import { verifyIdentity } from "../../utils/persona";
import queryClient from "../../utils/queryClient";
import useIntercom from "../../utils/useIntercom";
import { OnboardingContext } from "../context/OnboardingProvider";
import ActionButton from "../shared/ActionButton";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function GettingStarted() {
  const { steps } = useContext(OnboardingContext);
  const { presentContent } = useIntercom();
  const { canGoBack } = router;
  return (
    <SafeView fullScreen backgroundColor="$backgroundBrandSoft" paddingBottom={0}>
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
          <CurrentStep />
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

              <Step
                title="Add funds to your account"
                description="Your funds serve as collateral, increasing your credit and debit limits."
                action="Learn more about collateral"
                icon={<ArrowDownToLine size={20} strokeWidth={2} color="$uiBrandSecondary" />}
                completed={steps.find(({ id }) => id === "add-funds")?.completed ?? false}
                onPress={() => {
                  presentContent("8950805").catch(handleError);
                }}
              />

              <Step
                title=" Verify your identity"
                description="To enable the Exa Card we need to verify your identity."
                action="Learn more about the KYC process"
                icon={<IdCard size={20} strokeWidth={2} color="$uiBrandSecondary" />}
                completed={steps.find(({ id }) => id === "verify-identity")?.completed ?? false}
                onPress={() => {
                  presentContent("9448693").catch(handleError);
                }}
              />
            </YStack>
          </YStack>
        </ScrollView>
      </View>
    </SafeView>
  );
}

function CurrentStep() {
  const { currentStep, completedSteps } = useContext(OnboardingContext);
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
  function handleAction() {
    switch (currentStep?.id) {
      case "add-funds":
        router.push("/add-funds/add-crypto");
        break;
      case "verify-identity":
        startKYC().catch(handleError);
        break;
    }
  }
  if (!currentStep) return null;
  return (
    <YStack gap="$s6" borderBottomWidth={1} borderBottomColor="$borderBrandSoft" padding="$s4">
      <YStack gap="$s4">
        <XStack>
          <ArrowDownToLine size={ms(32)} color="$uiBrandSecondary" />
        </XStack>
        <Text emphasized title3 color="$uiBrandSecondary">
          {currentStep.id === "add-funds" ? "Add funds to your account" : "Verify your identity"}
        </Text>
      </YStack>
      <YStack>
        <Text subHeadline color="$uiNeutralSecondary">
          {currentStep.id === "add-funds"
            ? "Your funds serve as collateral, increasing your credit and debit limits. The more funds you add, the more you can spend with the Exa Card."
            : "Verifying your identity grants you access to our all-in-one Exa Card, enabling you to easily spend your crypto."}
        </Text>
      </YStack>
      <StepCounter completedSteps={completedSteps} />
      <YStack>
        <ActionButton
          marginTop="$s4"
          marginBottom="$s5"
          onPress={handleAction}
          iconAfter={
            currentStep.id === "add-funds" ? (
              <ArrowDownToLine size={20} color="$interactiveOnBaseBrandDefault" strokeWidth={2} />
            ) : (
              <IdCard size={20} color="$interactiveOnBaseBrandDefault" strokeWidth={2} />
            )
          }
        >
          {currentStep.id === "add-funds" ? "Add funds" : "Begin verifying"}
        </ActionButton>
      </YStack>
    </YStack>
  );
}

function StepCounter({ completedSteps }: { completedSteps: number }) {
  return (
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
          {completedSteps > 1 ? "One step left" : "Two steps left"}
        </Text>
        <Text emphasized subHeadline color="$uiBrandTertiary">
          {completedSteps}/3
        </Text>
      </XStack>
    </YStack>
  );
}