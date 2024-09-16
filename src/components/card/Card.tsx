import type { Passkey } from "@exactly/common/types";
import { ChevronDown, Eye, EyeOff, Info, Snowflake, X } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, Pressable } from "react-native";
import { Inquiry } from "react-native-persona";
import { useSharedValue } from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { ScrollView, Switch, styled, Spinner, XStack, Accordion, Square } from "tamagui";

import CardBack from "./CardBack";
import CardFront from "./CardFront";
import FlipCard from "./FlipCard";
import SimulatePurchase from "./SimulatePurchase";
import SpendingLimitButton from "./SpendingLimitButton";
import handleError from "../../utils/handleError";
import { environment, templateId } from "../../utils/persona";
import queryClient from "../../utils/queryClient";
import { getCard, kyc, kycStatus } from "../../utils/server";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

const StyledAction = styled(View, {
  flex: 1,
  minHeight: ms(140),
  borderWidth: 1,
  padding: ms(16),
  borderRadius: 10,
  backgroundColor: "$backgroundSoft",
  borderColor: "$borderNeutralSoft",
  justifyContent: "space-between",
  width: "100%",
});

export default function Card() {
  const { data: passkey } = useQuery<Passkey>({ queryKey: ["passkey"] });
  const { data: alertShown } = useQuery({ queryKey: ["settings", "alertShown"] });
  const [detailsShown, setDetailsShown] = useState(false);
  const flipped = useSharedValue(false);

  const {
    data: card,
    error: cardError,
    refetch: refetchCard,
  } = useQuery({
    queryKey: ["card"],
    queryFn: getCard,
    enabled: false,
  });

  const {
    mutateAsync: revealCard,
    isPending: isRevealing,
    error: revealError,
  } = useMutation({
    mutationKey: ["revealCard"],
    mutationFn: async function handleReveal() {
      if (!passkey || isRevealing) return;
      if (detailsShown) {
        setDetailsShown(false);
        flipped.value = false;
        return;
      }
      try {
        await kycStatus();
      } catch {
        if (Platform.OS !== "web") {
          Inquiry.fromTemplate(templateId)
            .environment(environment)
            .referenceId(passkey.credentialId)
            .onComplete((inquiryId) => {
              if (!inquiryId) throw new Error("no inquiry id");
              kyc(inquiryId).catch(handleError);
            })
            .onError(handleError)
            .build()
            .start();
          return;
        }
        const otl = await kyc();
        window.open(otl, "_self");
      }

      const { error } = await refetchCard();
      setDetailsShown(!error);
      flipped.value = !error;
    },
  });

  return (
    <SafeView fullScreen tab>
      <ScrollView>
        <View fullScreen padded>
          <View gap="$s5" flex={1}>
            <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
              <Text fontSize={ms(20)} fontWeight="bold">
                My Card
              </Text>
            </View>
            <View alignItems="center" gap="$s5" width="100%">
              <FlipCard
                flipped={flipped}
                Front={<CardFront lastFour={card?.lastFour} />}
                Back={card?.url ? <CardBack uri={card.url} flipped={flipped.value} /> : undefined}
              />

              {(cardError ?? revealError) && (
                <Text color="$uiErrorPrimary" fontWeight="bold">
                  {cardError ? cardError.message : revealError ? revealError.message : "Error"}
                </Text>
              )}

              {detailsShown && alertShown && (
                <XStack
                  borderWidth={1}
                  borderRadius="$r3"
                  backgroundColor="$backgroundSoft"
                  borderColor="$borderSuccessSoft"
                  width="100%"
                >
                  <View
                    padding="$s4"
                    backgroundColor="$interactiveBaseSuccessSoftDefault"
                    justifyContent="center"
                    alignItems="center"
                    borderTopLeftRadius="$r3"
                    borderBottomLeftRadius="$r3"
                    flex={1}
                  >
                    <Info size={ms(24)} color="$interactiveOnBaseSuccessSoft" />
                  </View>
                  <View flex={6} padding="$s4">
                    <Text fontSize={ms(15)} color="$uiSuccessPrimary" paddingRight="$s4">
                      Manually add your card to Apple Pay & Google Pay to make contactless payments
                    </Text>
                    <View
                      position="absolute"
                      right="$s3"
                      top="$s3"
                      backgroundColor="$interactiveBaseSuccessSoftDefault"
                      borderRadius="$r_0"
                      width={ms(24)}
                      height={ms(24)}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Pressable
                        hitSlop={ms(10)}
                        onPress={() => {
                          queryClient.setQueryData(["settings", "alertShown"], false);
                        }}
                      >
                        <X size={ms(18)} color="$interactiveOnBaseSuccessSoft" />
                      </Pressable>
                    </View>
                  </View>
                </XStack>
              )}
              <View flexDirection="row" justifyContent="space-between" width="100%" gap="$s4">
                <StyledAction>
                  <Pressable
                    onPress={() => {
                      if (isRevealing) return;
                      revealCard().catch(handleError);
                    }}
                    disabled={isRevealing}
                  >
                    <View gap="$s3_5">
                      {detailsShown ? (
                        <Eye size={ms(24)} color="$backgroundBrand" fontWeight="bold" />
                      ) : (
                        <EyeOff size={ms(24)} color="$backgroundBrand" fontWeight="bold" />
                      )}
                      <Text fontSize={ms(15)}>Details</Text>
                      {isRevealing ? (
                        <Spinner color="$interactiveBaseBrandDefault" alignSelf="flex-start" />
                      ) : (
                        <Text color="$interactiveBaseBrandDefault" fontSize={ms(15)} fontWeight="bold">
                          {detailsShown ? "Hide" : "Reveal"}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                </StyledAction>
                <StyledAction>
                  <Pressable>
                    <View gap="$s3_5">
                      <Snowflake size={ms(24)} color="$interactiveDisabled" fontWeight="bold" />
                      <Text fontSize={ms(15)} color="$interactiveDisabled">
                        Freeze
                      </Text>
                      <Switch disabled backgroundColor="$backgroundMild" borderColor="$borderNeutralSoft">
                        <Switch.Thumb
                          disabled
                          animation="quicker"
                          backgroundColor="$backgroundSoft"
                          shadowColor="$uiNeutralPrimary"
                        />
                      </Switch>
                    </View>
                  </Pressable>
                </StyledAction>
              </View>
            </View>

            <SimulatePurchase />

            <View>
              <Accordion
                overflow="hidden"
                type="multiple"
                backgroundColor="$backgroundSoft"
                borderRadius="$r3"
                padding="$s4"
              >
                <Accordion.Item value="a1" flex={1}>
                  <Accordion.Trigger
                    unstyled
                    flexDirection="row"
                    justifyContent="space-between"
                    backgroundColor="transparent"
                    borderWidth={0}
                    alignItems="center"
                  >
                    {({ open }: { open: boolean }) => (
                      <>
                        <Text emphasized headline>
                          Spending Limits
                        </Text>
                        <Square animation="quick" rotate={open ? "180deg" : "0deg"}>
                          <ChevronDown size={ms(24)} color="$interactiveTextBrandDefault" />
                        </Square>
                      </>
                    )}
                  </Accordion.Trigger>
                  <Accordion.HeightAnimator animation="quick">
                    <Accordion.Content exitStyle={exitStyle} gap="$s4" paddingTop="$s4">
                      <SpendingLimitButton title="Daily" limit={1000} />
                      <SpendingLimitButton title="Weekly" limit={3000} />
                      <SpendingLimitButton title="Monthly" limit={5000} />
                    </Accordion.Content>
                  </Accordion.HeightAnimator>
                </Accordion.Item>
              </Accordion>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}

const exitStyle = { opacity: 0 };
