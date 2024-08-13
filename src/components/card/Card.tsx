import { ArrowRight, Calculator, ChevronRight, Eye, Info, Plus, Snowflake } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Switch, styled, Spinner } from "tamagui";

import CardDetails from "./CardDetails";
import LatestActivity from "./LatestActivity";
import SpendingLimitButton from "./SpendingLimitButton";
import handleError from "../../utils/handleError";
import { getCard } from "../../utils/server";
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
  const {
    data: uri,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ["card"], queryFn: getCard, enabled: false, staleTime: 60_000 });

  function reveal() {
    refetch().catch(handleError);
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

            {isLoading && <Spinner color="$interactiveBaseBrandDefault" />}
            {!isLoading && uri && <CardDetails uri={uri} />}

            {error && (
              <Text color="$uiErrorPrimary" fontWeight="bold">
                {error.message}
              </Text>
            )}

            <View flexDirection="row" justifyContent="space-between" gap={ms(10)}>
              <StyledAction>
                <Pressable onPress={reveal}>
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
                    <Snowflake size={ms(24)} color="$backgroundBrand" fontWeight="bold" />
                    <Text fontSize={ms(15)}>Freeze</Text>
                    <Switch backgroundColor="$backgroundMild" borderColor="$borderNeutralSoft">
                      <Switch.Thumb
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
              title="Installments"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$interactiveBaseBrandDefault" fontSize={ms(14)} lineHeight={18} fontWeight="bold">
                      Simulate payment
                    </Text>
                    <Calculator size={ms(14)} color="$interactiveTextBrandDefault" />
                  </View>
                </Pressable>
              }
            >
              <View gap={ms(20)}>
                <Text textAlign="left" fontSize={15} color="$uiNeutralSecondary">
                  Set the default amount of installments before paying in-store with the card.
                </Text>

                <View
                  width="100%"
                  flexDirection="row"
                  gap={ms(10)}
                  flexWrap="wrap"
                  borderWidth={1}
                  borderColor="$borderBrandSoft"
                  padding={ms(10)}
                  borderRadius="$r5"
                >
                  {Array.from({ length: 6 }).map((_, index) => (
                    <View
                      key={index}
                      width={ms(55)}
                      height={ms(55)}
                      borderRadius="$r4"
                      backgroundColor={index === 0 ? "$interactiveBaseBrandDefault" : "transparent"}
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text
                        fontSize={15}
                        color={index === 0 ? "$interactiveBaseBrandSoftDefault" : "$interactiveBaseBrandDefault"}
                        fontWeight="bold"
                      >
                        {index + 1}
                      </Text>
                    </View>
                  ))}
                </View>

                <View borderTopWidth={1} borderTopColor="$borderNeutralSeparator" paddingTop={ms(20)}>
                  <Pressable>
                    <View flexDirection="row" justifyContent="space-between" alignItems="center" gap={ms(10)}>
                      <Text color="$uiNeutralSecondary">Learn more about installments</Text>
                      <ArrowRight size={14} color="$iconSecondary" />
                    </View>
                  </Pressable>
                </View>
              </View>
            </InfoCard>

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
                <SpendingLimitButton title="Daily" amount={324.87} limit={500} currency="$" />
                <SpendingLimitButton title="Weekly" amount={1000} limit={2000} currency="$" />
                <SpendingLimitButton title="Monthly" amount={4713.64} limit={9000} currency="$" />
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

            <InfoCard
              title="Latest activity"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$interactiveBaseBrandDefault" fontSize={14} lineHeight={18} fontWeight="bold">
                      View all
                    </Text>
                    <ChevronRight size={14} color="$interactiveBaseBrandDefault" />
                  </View>
                </Pressable>
              }
            >
              <LatestActivity />
            </InfoCard>
          </View>
        </View>
      </ScrollView>
    </SafeView>
  );
}
