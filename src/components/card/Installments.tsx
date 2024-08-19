import { ArrowRight, Calculator } from "@tamagui/lucide-icons";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";

import InfoCard from "../home/InfoCard";
import Text from "../shared/Text";
import View from "../shared/View";

export default function Installments() {
  return (
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
  );
}
