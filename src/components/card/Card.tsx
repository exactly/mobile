import { ArrowRight, Eye, Info, Plus, Snowflake } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Switch, styled, Spinner } from "tamagui";

import CardDetails from "./CardDetails";
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
