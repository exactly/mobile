import type { Passkey } from "@exactly/common/validation";
import { ChevronDown, Eye, EyeOff, Info, Snowflake, X } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, Pressable, RefreshControl } from "react-native";
import { Inquiry } from "react-native-persona";
import { useSharedValue } from "react-native-reanimated";
import { ms } from "react-native-size-matters";
import { ScrollView, Switch, styled, Spinner, XStack, Accordion, Square } from "tamagui";

import CardBack from "./CardBack";
import CardFront from "./CardFront";
import CreditLimit from "./CreditLimit";
import DebitLimit from "./DebitLimit";
import FlipCard from "./FlipCard";
import SimulatePurchase from "./SimulatePurchase";
import SpendingLimitButton from "./SpendingLimitButton";
import handleError from "../../utils/handleError";
import { environment, templateId } from "../../utils/persona";
import queryClient from "../../utils/queryClient";
import { APIError, getActivity, getCard, createCard, kyc, kycStatus, setCardStatus } from "../../utils/server";
import LatestActivity from "../shared/LatestActivity";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Card() {
  const { data: passkey } = useQuery<Passkey>({ queryKey: ["passkey"] });
  const { data: alertShown } = useQuery({ queryKey: ["settings", "alertShown"] });
  const {
    data: purchases,
    refetch: refetchPurchases,
    isFetching,
  } = useQuery({
    queryKey: ["activity", "card"],
    queryFn: () => getActivity({ include: "card" }),
  });

  const {
    data: cardDetails,
    error: cardError,
    isFetching: isFetchingCardDetails,
  } = useQuery({
    queryKey: ["card", "details"],
    queryFn: getCard,
    retry: false,
  });

  const { mutateAsync: changeCardStatus, isPending: isSettingCardStatus } = useMutation({
    mutationKey: ["card", "status"],
    mutationFn: setCardStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card", "details"] }).catch(handleError);
    },
  });

  const [detailsShown, setDetailsShown] = useState(false);
  const flipped = useSharedValue(false);

  const {
    mutateAsync: revealCard,
    isPending: isRevealing,
    error: revealError,
  } = useMutation({
    mutationKey: ["card", "reveal"],
    mutationFn: async function handleReveal() {
      if (!passkey || isRevealing) return;
      if (detailsShown) {
        setDetailsShown(false);
        flipped.value = false;
        return;
      }
      try {
        await kycStatus();
        await getCard();
        await queryClient.refetchQueries({ queryKey: ["card, details"] });
        setDetailsShown(true);
        flipped.value = true;
      } catch (error) {
        if (!(error instanceof APIError)) return handleError(error);
        if (
          (error.code === 403 && error.text === "kyc required") ||
          (error.code === 404 && error.text === "kyc not found")
        ) {
          if (Platform.OS === "web") {
            const otl = await kyc();
            window.open(otl, "_self");
            return;
          }
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
        }
        if (error.code === 404 && error.text === "card not found") {
          await createCard();
          await queryClient.invalidateQueries({ queryKey: ["card, details"] });
        }
      }
    },
  });

  return (
    <SafeView fullScreen tab>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => {
              refetchPurchases().catch(handleError);
            }}
          />
        }
      >
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
                Front={<CardFront lastFour={cardDetails?.lastFour} />}
                Back={
                  cardDetails?.url && detailsShown ? (
                    <CardBack uri={cardDetails.url} flipped={flipped.value} />
                  ) : undefined
                }
              />

              {(cardError ?? revealError) && !isRevealing && (
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
                      <Text fontSize={ms(15)} color="$uiNeutralPrimary">
                        Details
                      </Text>
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
                  <View gap="$s3_5">
                    <Snowflake size={ms(24)} color="$interactiveBaseBrandDefault" fontWeight="bold" />
                    <Text fontSize={ms(15)} color="$uiNeutralPrimary">
                      Freeze
                    </Text>
                    <XStack alignItems="center" gap="$s3">
                      <View>
                        <Switch
                          disabled={isFetchingCardDetails || isSettingCardStatus}
                          checked={cardDetails?.status === "FROZEN"}
                          onCheckedChange={(checked) => {
                            changeCardStatus(checked ? "FROZEN" : "ACTIVE").catch(handleError);
                          }}
                          backgroundColor="$backgroundMild"
                          borderColor="$borderNeutralSoft"
                        >
                          <Switch.Thumb
                            disabled={isFetchingCardDetails || isSettingCardStatus}
                            animation="quicker"
                            backgroundColor="$interactiveBaseBrandDefault"
                            shadowColor="$uiNeutralSecondary"
                          />
                        </Switch>
                      </View>
                      <View>
                        {isSettingCardStatus && <Spinner color="$interactiveBaseBrandDefault" alignSelf="flex-start" />}
                      </View>
                    </XStack>
                  </View>
                </StyledAction>
              </View>
            </View>
            <CreditLimit />
            <DebitLimit />
            <SimulatePurchase />
            {purchases && purchases.length > 0 && <LatestActivity activity={purchases} title="Latest purchases" />}
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
const StyledAction = styled(View, {
  minHeight: ms(140),
  borderWidth: 1,
  padding: ms(16),
  borderRadius: 10,
  backgroundColor: "$backgroundSoft",
  borderColor: "$borderNeutralSoft",
  justifyContent: "space-between",
  flex: 1,
});
