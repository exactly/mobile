import type { Passkey } from "@exactly/common/validation";
import { ChevronDown, Eye, EyeOff, Info, Snowflake, CreditCard } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, Pressable, RefreshControl } from "react-native";
import { Inquiry } from "react-native-persona";
import { ms } from "react-native-size-matters";
import { ScrollView, styled, Spinner, XStack, Accordion, Square } from "tamagui";

import CardDetails from "./CardDetails";
import SimulatePurchase from "./SimulatePurchase";
import SpendingLimitButton from "./SpendingLimitButton";
import ExaCard from "./exa-card/ExaCard";
import handleError from "../../utils/handleError";
import { environment, templateId } from "../../utils/persona";
import queryClient from "../../utils/queryClient";
import { APIError, getActivity, getCard, createCard, kyc, kycStatus, setCardStatus } from "../../utils/server";
import useIntercom from "../../utils/useIntercom";
import LatestActivity from "../shared/LatestActivity";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Card() {
  const { presentContent } = useIntercom();
  const [cardDetailsOpen, setCardDetailsOpen] = useState(false);
  const { data: hidden } = useQuery<boolean>({ queryKey: ["settings", "sensitive"] });
  function toggle() {
    queryClient.setQueryData(["settings", "sensitive"], !hidden);
  }
  const { data: passkey } = useQuery<Passkey>({ queryKey: ["passkey"] });
  const {
    data: purchases,
    refetch: refetchPurchases,
    isPending,
  } = useQuery({
    queryKey: ["activity", "card"],
    queryFn: () => getActivity({ include: "card" }),
  });

  const { data: cardDetails, refetch: refetchCard } = useQuery({
    queryKey: ["card", "details"],
    queryFn: getCard,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  const {
    mutateAsync: changeCardStatus,
    isPending: isSettingCardStatus,
    variables: optimisticCardStatus,
  } = useMutation({
    mutationKey: ["card", "status"],
    mutationFn: setCardStatus,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["card", "details"] });
    },
  });

  const displayStatus = isSettingCardStatus ? optimisticCardStatus : cardDetails?.status;

  const {
    mutateAsync: revealCard,
    isPending: isRevealing,
    error: revealError,
  } = useMutation({
    mutationKey: ["card", "reveal"],
    mutationFn: async function handleReveal() {
      if (!passkey || isRevealing) return;
      try {
        const { isSuccess, data } = await refetchCard();
        if (isSuccess && data.url) {
          setCardDetailsOpen(true);
        } else {
          await kycStatus();
        }
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
          await queryClient.refetchQueries({ queryKey: ["card, details"] });
        }
        handleError(error);
      }
    },
  });

  return (
    <>
      <SafeView fullScreen tab>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isPending}
              onRefresh={() => {
                refetchPurchases().catch(handleError);
              }}
            />
          }
        >
          <View fullScreen>
            <View flex={1}>
              <View alignItems="center" gap="$s5" width="100%" backgroundColor="$backgroundSoft" padded>
                <XStack gap={ms(10)} justifyContent="space-between" alignItems="center" width="100%">
                  <Text fontSize={ms(20)} fontWeight="bold">
                    My Exa Card
                  </Text>
                  <View display="flex" flexDirection="row" alignItems="center" gap={16}>
                    <Pressable onPress={toggle} hitSlop={ms(15)}>
                      {hidden ? <Eye color="$uiNeutralPrimary" /> : <EyeOff color="$uiNeutralPrimary" />}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        presentContent("9994746").catch(handleError);
                      }}
                      hitSlop={ms(15)}
                    >
                      <Info color="$uiNeutralPrimary" />
                    </Pressable>
                  </View>
                </XStack>

                <ExaCard />

                {revealError && (
                  <Text color="$uiErrorPrimary" fontWeight="bold">
                    {revealError.message}
                  </Text>
                )}

                <View flexDirection="row" justifyContent="space-between" width="100%" gap="$s4">
                  <StyledAction>
                    <Pressable
                      onPress={() => {
                        if (isRevealing) return;
                        revealCard().catch(handleError);
                      }}
                      disabled={isRevealing}
                      style={{ padding: ms(16) }}
                    >
                      <XStack gap="$s3_5" alignItems="center">
                        <Text emphasized fontSize={ms(15)} color="$interactiveOnBaseBrandSoft">
                          Card Details
                        </Text>
                        {isRevealing ? (
                          <Spinner color="$interactiveOnBaseBrandSoft" alignSelf="flex-start" />
                        ) : (
                          <CreditCard size={ms(24)} color="$backgroundBrand" fontWeight="bold" />
                        )}
                      </XStack>
                    </Pressable>
                  </StyledAction>

                  <StyledAction>
                    <Pressable
                      onPress={() => {
                        if (isSettingCardStatus) return;
                        changeCardStatus(cardDetails?.status === "FROZEN" ? "ACTIVE" : "FROZEN").catch(handleError);
                      }}
                      style={{ padding: ms(16) }}
                    >
                      <XStack gap="$s3_5" alignItems="center">
                        <Text emphasized fontSize={ms(15)} color="$interactiveOnBaseBrandSoft">
                          {displayStatus === "FROZEN" ? "Unfreeze Card" : "Freeze Card"}
                        </Text>
                        <Square size={ms(24)}>
                          {isSettingCardStatus ? (
                            <Spinner width={ms(24)} color="$interactiveBaseBrandDefault" alignSelf="flex-start" />
                          ) : (
                            <Snowflake size={ms(24)} color="$interactiveBaseBrandDefault" fontWeight="bold" />
                          )}
                        </Square>
                      </XStack>
                    </Pressable>
                  </StyledAction>
                </View>
              </View>

              <View padded gap="$s5">
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
          </View>
        </ScrollView>

        <CardDetails
          uri={cardDetails?.url}
          open={cardDetailsOpen}
          onClose={() => {
            setCardDetailsOpen(false);
          }}
        />
      </SafeView>
    </>
  );
}

const exitStyle = { opacity: 0 };

const StyledAction = styled(View, {
  height: ms(64),
  borderWidth: 1,
  borderRadius: 8,
  backgroundColor: "transparent",
  borderColor: "$interactiveOnBaseBrandSoft",
  justifyContent: "center",
  alignItems: "center",
  flex: 1,
});
