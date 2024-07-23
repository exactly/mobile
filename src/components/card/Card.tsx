import { ArrowRight, Calculator, CaretRight, Info, Plus } from "phosphor-react-native";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Text, View, useTheme } from "tamagui";

import CardActions from "./CardActions";
import LatestActivity from "./LatestActivity";
import SpendingLimitButton from "./SpendingLimitButton";
import BaseLayout from "../shared/BaseLayout";
import InfoPreview from "../shared/InfoPreview";
import SafeView from "../shared/SafeView";

export default function Card() {
  const theme = useTheme();
  return (
    <SafeView paddingBottom={0}>
      <ScrollView>
        <BaseLayout width="100%" height="100%">
          <View gap={ms(20)} flex={1} paddingVertical={ms(20)}>
            <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
              <Text color="uiPrimary" fontSize={ms(20)} fontWeight="bold">
                My Cards
              </Text>
              <Pressable>
                <Info color={theme.uiNeutralPrimary.get()} />
              </Pressable>
            </View>

            <CardActions />

            <InfoPreview
              title="Installments"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$interactiveBaseBrandDefault" fontSize={ms(14)} lineHeight={18} fontWeight="bold">
                      Simulate payment
                    </Text>
                    <Calculator size={ms(14)} color={theme.interactiveTextBrandDefault.get()} />
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
                      backgroundColor={index === 0 ? theme.interactiveBaseBrandDefault.get() : "transparent"}
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
                      <ArrowRight size={14} color={theme.iconSecondary.get()} />
                    </View>
                  </Pressable>
                </View>
              </View>
            </InfoPreview>

            <InfoPreview
              title="Spending limits"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$interactiveBaseBrandDefault" fontSize={14} lineHeight={18} fontWeight="bold">
                      Increase limits
                    </Text>
                    <Plus size={14} color={theme.interactiveBaseBrandDefault.get()} weight="bold" />
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
                    <ArrowRight size={14} color={theme.iconSecondary.get()} />
                  </View>
                </Pressable>
              </View>
            </InfoPreview>

            <InfoPreview
              title="Latest activity"
              renderAction={
                <Pressable>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$interactiveBaseBrandDefault" fontSize={14} lineHeight={18} fontWeight="bold">
                      View all
                    </Text>
                    <CaretRight size={14} color={theme.interactiveBaseBrandDefault.get()} />
                  </View>
                </Pressable>
              }
            >
              <LatestActivity />
            </InfoPreview>
          </View>
        </BaseLayout>
      </ScrollView>
    </SafeView>
  );
}
