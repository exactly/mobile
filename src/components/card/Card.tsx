import { ArrowRight, Calculator, CaretRight, Info, Plus } from "phosphor-react-native";
import React from "react";
import { TouchableOpacity } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Text, View, useTheme } from "tamagui";

import LatestActivity from "./LatestActivity";
import BaseLayout from "../shared/BaseLayout";
import InfoPreview from "../shared/InfoPreview";
import SafeView from "../shared/SafeView";

const Card = () => {
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
              <TouchableOpacity>
                <Info color={theme.uiPrimary.get() as string} />
              </TouchableOpacity>
            </View>

            <InfoPreview
              title="Installments"
              renderAction={
                <TouchableOpacity>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={ms(14)} lineHeight={18} fontWeight="bold">
                      Simulate payment
                    </Text>
                    <Calculator size={ms(14)} color={theme.textBrand.get() as string} />
                  </View>
                </TouchableOpacity>
              }
            >
              <View gap={ms(20)}>
                <Text textAlign="left" fontSize={15} color="$uiSecondary">
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
                  borderRadius={16}
                >
                  {Array.from({ length: 6 }).map((_, index) => (
                    <View
                      key={index}
                      width={ms(55)}
                      height={ms(55)}
                      borderRadius={12}
                      backgroundColor={
                        index === 0 ? (theme.interactiveBaseBrandDefault.get() as string) : "transparent"
                      }
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

                <TouchableOpacity>
                  <View flexDirection="row" justifyContent="space-between" gap={ms(10)}>
                    <Text color="$uiSecondary">Learn more about installments</Text>
                    <ArrowRight size={14} color={theme.iconSecondary.get() as string} />
                  </View>
                </TouchableOpacity>
              </View>
            </InfoPreview>

            <InfoPreview
              title="Spending limits"
              renderAction={
                <TouchableOpacity>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      Increase limits
                    </Text>
                    <Plus size={14} color={theme.textBrand.get() as string} weight="bold" />
                  </View>
                </TouchableOpacity>
              }
            >
              <Text textAlign="center" fontSize={15} color="$uiSecondary">
                Learn more about your credit limit.
              </Text>
            </InfoPreview>

            <InfoPreview
              title="Latest activity"
              renderAction={
                <TouchableOpacity>
                  <View flexDirection="row" gap={2} alignItems="center">
                    <Text color="$textBrand" fontSize={14} lineHeight={18} fontWeight="bold">
                      View all
                    </Text>
                    <CaretRight size={14} color={theme.textBrand.get() as string} />
                  </View>
                </TouchableOpacity>
              }
            >
              <LatestActivity />
            </InfoPreview>
          </View>
        </BaseLayout>
      </ScrollView>
    </SafeView>
  );
};

export default Card;
