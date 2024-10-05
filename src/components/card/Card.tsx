import type { Passkey } from "@exactly/common/validation";

import { ChevronDown, Eye, EyeOff, Info, Snowflake, X } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, Pressable, RefreshControl } from "react-native";
import { Inquiry } from "react-native-persona";
import { useSharedValue } from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { Accordion, ScrollView, Spinner, Square, styled, Switch, XStack } from "tamagui";

import handleError from "../../utils/handleError";
import { environment, templateId } from "../../utils/persona";
import queryClient from "../../utils/queryClient";
import { APIError, getActivity, getCard, kyc, kycStatus } from "../../utils/server";
import CreditLimit from "../home/CreditLimit";
import LatestActivity from "../shared/LatestActivity";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";
import CardBack from "./CardBack";
import CardFront from "./CardFront";
import FlipCard from "./FlipCard";
import SimulatePurchase from "./SimulatePurchase";
import SpendingLimitButton from "./SpendingLimitButton";

const StyledAction = styled(View, {
  backgroundColor: "$backgroundSoft",
  borderColor: "$borderNeutralSoft",
  borderRadius: 10,
  borderWidth: 1,
  flex: 1,
  justifyContent: "space-between",
  minHeight: ms(140),
  padding: ms(16),
  width: "100%",
});

export default function Card() {
  const { data: passkey } = useQuery<Passkey>({ queryKey: ["passkey"] });
  const { data: alertShown } = useQuery({ queryKey: ["settings", "alertShown"] });
  const {
    data: purchases,
    isFetching,
    refetch: refetchPurchases,
  } = useQuery({ queryFn: () => getActivity({ include: "card" }), queryKey: ["activity", "card"] });

  const [detailsShown, setDetailsShown] = useState(false);
  const flipped = useSharedValue(false);

  const {
    data: card,
    error: cardError,
    refetch: refetchCard,
  } = useQuery({
    enabled: false,
    queryFn: getCard,
    queryKey: ["card"],
  });

  const {
    error: revealError,
    isPending: isRevealing,
    mutateAsync: revealCard,
  } = useMutation({
    mutationFn: async function handleReveal() {
      if (!passkey || isRevealing) return;
      if (detailsShown) {
        setDetailsShown(false);
        flipped.value = false;
        return;
      }
      try {
        await kycStatus();
      } catch (error) {
        if (error instanceof APIError && error.code === 401) return;
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
    mutationKey: ["revealCard"],
  });

  return (
    <SafeView fullScreen tab>
      <ScrollView
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              refetchPurchases().catch(handleError);
            }}
            refreshing={isFetching}
          />
        }
      >
        <View fullScreen padded>
          <View flex={1} gap="$s5">
            <View alignItems="center" flexDirection="row" gap={ms(10)} justifyContent="space-between">
              <Text fontSize={ms(20)} fontWeight="bold">
                My Card
              </Text>
            </View>
            <View alignItems="center" gap="$s5" width="100%">
              <FlipCard
                Back={card?.url ? <CardBack flipped={flipped.value} uri={card.url} /> : undefined}
                flipped={flipped}
                Front={<CardFront lastFour={card?.lastFour} />}
              />

              {(cardError ?? revealError) && (
                <Text color="$uiErrorPrimary" fontWeight="bold">
                  {cardError ? cardError.message : revealError ? revealError.message : "Error"}
                </Text>
              )}

              {detailsShown && alertShown && (
                <XStack
                  backgroundColor="$backgroundSoft"
                  borderColor="$borderSuccessSoft"
                  borderRadius="$r3"
                  borderWidth={1}
                  width="100%"
                >
                  <View
                    alignItems="center"
                    backgroundColor="$interactiveBaseSuccessSoftDefault"
                    borderBottomLeftRadius="$r3"
                    borderTopLeftRadius="$r3"
                    flex={1}
                    justifyContent="center"
                    padding="$s4"
                  >
                    <Info color="$interactiveOnBaseSuccessSoft" size={ms(24)} />
                  </View>
                  <View flex={6} padding="$s4">
                    <Text color="$uiSuccessPrimary" fontSize={ms(15)} paddingRight="$s4">
                      Manually add your card to Apple Pay & Google Pay to make contactless payments
                    </Text>
                    <View
                      alignItems="center"
                      backgroundColor="$interactiveBaseSuccessSoftDefault"
                      borderRadius="$r_0"
                      height={ms(24)}
                      justifyContent="center"
                      position="absolute"
                      right="$s3"
                      top="$s3"
                      width={ms(24)}
                    >
                      <Pressable
                        hitSlop={ms(10)}
                        onPress={() => {
                          queryClient.setQueryData(["settings", "alertShown"], false);
                        }}
                      >
                        <X color="$interactiveOnBaseSuccessSoft" size={ms(18)} />
                      </Pressable>
                    </View>
                  </View>
                </XStack>
              )}
              <View flexDirection="row" gap="$s4" justifyContent="space-between" width="100%">
                <StyledAction>
                  <Pressable
                    disabled={isRevealing}
                    onPress={() => {
                      if (isRevealing) return;
                      revealCard().catch(handleError);
                    }}
                  >
                    <View gap="$s3_5">
                      {detailsShown ? (
                        <Eye color="$backgroundBrand" fontWeight="bold" size={ms(24)} />
                      ) : (
                        <EyeOff color="$backgroundBrand" fontWeight="bold" size={ms(24)} />
                      )}
                      <Text fontSize={ms(15)}>Details</Text>
                      {isRevealing ? (
                        <Spinner alignSelf="flex-start" color="$interactiveBaseBrandDefault" />
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
                      <Snowflake color="$interactiveDisabled" fontWeight="bold" size={ms(24)} />
                      <Text color="$interactiveDisabled" fontSize={ms(15)}>
                        Freeze
                      </Text>
                      <Switch backgroundColor="$backgroundMild" borderColor="$borderNeutralSoft" disabled>
                        <Switch.Thumb
                          animation="quicker"
                          backgroundColor="$backgroundSoft"
                          disabled
                          shadowColor="$uiNeutralPrimary"
                        />
                      </Switch>
                    </View>
                  </Pressable>
                </StyledAction>
              </View>
            </View>
            <CreditLimit />
            <SimulatePurchase />
            {purchases && purchases.length > 0 && <LatestActivity activity={purchases} title="Latest purchases" />}
            <View>
              <Accordion
                backgroundColor="$backgroundSoft"
                borderRadius="$r3"
                overflow="hidden"
                padding="$s4"
                type="multiple"
              >
                <Accordion.Item flex={1} value="a1">
                  <Accordion.Trigger
                    alignItems="center"
                    backgroundColor="transparent"
                    borderWidth={0}
                    flexDirection="row"
                    justifyContent="space-between"
                    unstyled
                  >
                    {({ open }: { open: boolean }) => (
                      <>
                        <Text emphasized headline>
                          Spending Limits
                        </Text>
                        <Square animation="quick" rotate={open ? "180deg" : "0deg"}>
                          <ChevronDown color="$interactiveTextBrandDefault" size={ms(24)} />
                        </Square>
                      </>
                    )}
                  </Accordion.Trigger>
                  <Accordion.HeightAnimator animation="quick">
                    <Accordion.Content exitStyle={exitStyle} gap="$s4" paddingTop="$s4">
                      <SpendingLimitButton limit={1000} title="Daily" />
                      <SpendingLimitButton limit={3000} title="Weekly" />
                      <SpendingLimitButton limit={5000} title="Monthly" />
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
