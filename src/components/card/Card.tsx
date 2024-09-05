import type { Passkey } from "@exactly/common/types";
import { Eye, EyeOff, Info, Snowflake } from "@tamagui/lucide-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, Pressable } from "react-native";
import { Inquiry } from "react-native-persona";
import { ms } from "react-native-size-matters";
import { ScrollView, Switch, styled, Spinner, XStack } from "tamagui";

import CardDetails from "./CardDetails";
import ISO7810_ASPECT_RATIO from "./ISO7810_ASPECT_RATIO";
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
  width: "100%",
});

export default function Card() {
  const [detailsShown, setDetailsShown] = useState(false);

  const { data: passkey } = useQuery<Passkey>({ queryKey: ["passkey"] });

  const { data: hasKYC } = useQuery({
    queryKey: ["kycStatus"],
    queryFn: kycStatus,
  });

  const {
    data: card,
    error: cardError,
    refetch: refetchCard,
  } = useQuery({
    queryKey: ["card"],
    queryFn: getCard,
    enabled: false,
  });

  const { error: OTLError, refetch: getOTL } = useQuery({
    queryKey: ["personaOTL"],
    enabled: Platform.OS === "web",
    queryFn: () => kyc(),
  });

  const { mutateAsync: saveKYC } = useMutation({
    mutationKey: ["saveKYC"],
    mutationFn: kyc,
    onSuccess: () => {
      queryClient.setQueryData(["kycStatus"], true);
    },
  });

  const { mutateAsync: handleReveal, isPending: isRevealing } = useMutation({
    mutationKey: ["revealCard"],
    mutationFn: async function handleReveal() {
      if (!passkey) return;
      if (detailsShown) {
        setDetailsShown(false);
        return;
      }
      if (hasKYC && !isRevealing) {
        await refetchCard();
        setDetailsShown(true);
        return;
      }
      if (Platform.OS !== "web") {
        Inquiry.fromTemplate(templateId)
          .environment(environment)
          .referenceId(passkey.credentialId)
          .onComplete((inquiryId) => {
            if (!inquiryId) throw new Error("no inquiry id");
            saveKYC(inquiryId).catch(handleError);
          })
          .onError(handleError)
          .build()
          .start();
        return;
      }
      const { data } = await getOTL();
      if (data?.otl) {
        window.open(data.otl);
        queryClient.setQueryData(["personaOTL"], undefined);
      }
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
              <Pressable>
                <Info color="$uiNeutralPrimary" />
              </Pressable>
            </View>
            <View alignItems="center" gap="$s5" width="100%">
              {card && detailsShown && <CardDetails uri={card.url} />}
              {detailsShown && (
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
                    flex={1}
                  >
                    <Info size={ms(24)} color="$interactiveOnBaseSuccessSoft" />
                  </View>
                  <View flex={6} padding="$s4">
                    <Text fontSize={ms(15)} color="$uiSuccessPrimary">
                      Manually add your card to Apple Pay & Google Pay to make contactless payments
                    </Text>
                  </View>
                </XStack>
              )}
              {!detailsShown && (
                <View
                  borderRadius="$r3"
                  overflow="hidden"
                  maxHeight={220}
                  width="100%"
                  aspectRatio={ISO7810_ASPECT_RATIO}
                  alignSelf="center"
                >
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
              )}
              {(cardError ?? OTLError) && (
                <Text color="$uiErrorPrimary" fontWeight="bold">
                  {cardError ? cardError.message : OTLError ? OTLError.message : "Error"}
                </Text>
              )}
              <View flexDirection="row" justifyContent="space-between" width="100%" gap="$s4">
                <StyledAction>
                  <Pressable
                    onPress={() => {
                      if (isRevealing) return;
                      handleReveal().catch(handleError);
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
            <View>
              <InfoCard title="Spending limits">
                <View gap="$s4">
                  <SpendingLimitButton title="Daily" limit={1000} />
                  <SpendingLimitButton title="Weekly" limit={3000} />
                  <SpendingLimitButton title="Monthly" limit={5000} />
                </View>
              </InfoCard>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
