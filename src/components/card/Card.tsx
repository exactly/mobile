import type { Passkey } from "@exactly/common/types";
import { ArrowRight, Eye, Info, Plus, Snowflake } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Platform, Pressable } from "react-native";
import { Inquiry } from "react-native-persona";
import { ms } from "react-native-size-matters";
import { ScrollView, Switch, styled, Spinner } from "tamagui";

import CardDetails from "./CardDetails";
import SpendingLimitButton from "./SpendingLimitButton";
import ExaCard from "../../assets/images/card.svg";
import handleError from "../../utils/handleError";
import { environment, templateId } from "../../utils/persona";
import queryClient from "../../utils/queryClient";
import { getCard, kyc, kycStatus } from "../../utils/server";
import InfoCard from "../home/InfoCard";
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
  flexBasis: "50%",
});

export default function Card() {
  const { data: passkey } = useQuery<Passkey>({ queryKey: ["passkey"] });
  const { data: hasKYC, isLoading: isLoadingKYC } = useQuery({
    queryKey: ["kycStatus"],
    queryFn: kycStatus,
  });

  const {
    data: card,
    isLoading: isLoadingCard,
    error: cardError,
    refetch: fetchCard,
  } = useQuery({
    queryKey: ["card"],
    queryFn: getCard,
    enabled: false,
    staleTime: 60_000,
  });

  const {
    data: oneTimeLink,
    isLoading: isLoadingOTL,
    error: OTLError,
  } = useQuery({
    queryKey: ["personaOTL"],
    enabled: Platform.OS === "web",
    queryFn: () => kyc(),
  });

  function handleReveal() {
    if (!passkey) return;
    if (hasKYC) {
      fetchCard().catch(handleError);
      return;
    }
    if (Platform.OS === "web") {
      if (isLoadingOTL || !oneTimeLink) return;
      window.open(oneTimeLink);
      queryClient.setQueryData(["personaOTL"], undefined);
    } else {
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
  }

  return (
    <SafeView fullScreen tab>
      <ScrollView>
        <View fullScreen padded>
          <View gap={ms(20)} flex={1}>
            <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
              <Text fontSize={ms(20)} fontWeight="bold">
                My Cards
              </Text>
              <Pressable>
                <Info color="$uiNeutralPrimary" />
              </Pressable>
            </View>

            {(isLoadingCard || isLoadingKYC || isLoadingOTL) && <Spinner color="$interactiveBaseBrandDefault" />}

            {card && <CardDetails uri={card.url} />}

            <View borderRadius="$r3" overflow="hidden" maxHeight={220} aspectRatio={1536 / 969} alignSelf="center">
              <ExaCard width="100%" height="100%" />
              <View
                position="absolute"
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap="$s1"
                bottom={10}
                left={10}
              >
                <Text color="white" emphasized callout verticalAlign="center" paddingTop={ms(3)}>
                  **** **** ****
                </Text>
                <Text color="white" emphasized callout paddingTop={card?.lastFour ? 0 : ms(3)}>
                  {card?.lastFour ?? "****"}
                </Text>
              </View>
            </View>

            {(cardError ?? OTLError) && (
              <Text color="$uiErrorPrimary" fontWeight="bold">
                {cardError ? cardError.message : OTLError ? OTLError.message : "Error"}
              </Text>
            )}
            <View flexDirection="row" justifyContent="space-between" gap={ms(10)}>
              <StyledAction>
                <Pressable onPress={handleReveal}>
                  <View gap={ms(10)}>
                    <Eye size={ms(24)} color="$backgroundBrand" fontWeight="bold" />
                    <Text fontSize={ms(15)}>Details</Text>
                    <Text color="$interactiveBaseBrandDefault" fontSize={ms(15)} fontWeight="bold">
                      Reveal
                    </Text>
                  </View>
                </Pressable>
              </StyledAction>
              <StyledAction>
                <Pressable>
                  <View gap={ms(10)}>
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
            <InfoCard
              title="Spending limits"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$interactiveBaseBrandDefault" fontSize={14} lineHeight={18} fontWeight="bold">
                      Increase limits
                    </Text>
                    <Plus size={14} color="$interactiveBaseBrandDefault" fontWeight="bold" />
                  </View>
                </Pressable>
              }
            >
              <View gap={ms(20)}>
                <SpendingLimitButton title="Daily" limit={1000} />
                <SpendingLimitButton title="Weekly" limit={3000} />
                <SpendingLimitButton title="Monthly" limit={5000} />
              </View>
              <View borderTopWidth={1} borderTopColor="$borderNeutralSeparator" paddingTop={ms(20)}>
                <Pressable>
                  <View flexDirection="row" justifyContent="space-between" alignItems="center" gap={ms(10)}>
                    <Text color="$uiNeutralSecondary">Learn more about spending limits.</Text>
                    <ArrowRight size={14} color="$iconSecondary" />
                  </View>
                </Pressable>
              </View>
            </InfoCard>
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
