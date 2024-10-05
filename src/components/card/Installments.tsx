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
      renderAction={
        <Pressable>
          <View alignItems="center" flexDirection="row" gap={2}>
            <Text color="$interactiveBaseBrandDefault" fontSize={ms(14)} fontWeight="bold" lineHeight={18}>
              Simulate payment
            </Text>
            <Calculator color="$interactiveTextBrandDefault" size={ms(14)} />
          </View>
        </Pressable>
      }
      title="Installments"
    >
      <View gap={ms(20)}>
        <Text color="$uiNeutralSecondary" fontSize={15} textAlign="left">
          Set the default amount of installments before paying in-store with the card.
        </Text>
        <View
          borderColor="$borderBrandSoft"
          borderRadius="$r5"
          borderWidth={1}
          flexDirection="row"
          flexWrap="wrap"
          gap={ms(10)}
          padding={ms(10)}
          width="100%"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              alignItems="center"
              backgroundColor={index === 0 ? "$interactiveBaseBrandDefault" : "transparent"}
              borderRadius="$r4"
              height={ms(55)}
              justifyContent="center"
              key={index}
              width={ms(55)}
            >
              <Text
                color={index === 0 ? "$interactiveBaseBrandSoftDefault" : "$interactiveBaseBrandDefault"}
                fontSize={15}
                fontWeight="bold"
              >
                {index + 1}
              </Text>
            </View>
          ))}
        </View>
        <View borderTopColor="$borderNeutralSeparator" borderTopWidth={1} paddingTop={ms(20)}>
          <Pressable>
            <View alignItems="center" flexDirection="row" gap={ms(10)} justifyContent="space-between">
              <Text color="$uiNeutralSecondary">Learn more about installments</Text>
              <ArrowRight color="$iconSecondary" size={14} />
            </View>
          </Pressable>
        </View>
      </View>
    </InfoCard>
  );
}
