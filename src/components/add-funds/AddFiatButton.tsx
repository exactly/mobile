import { PiggyBank, CreditCard, DollarSign, Euro, PoundSterling, Banknote } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View } from "tamagui";

import Text from "../shared/Text";

function navigate() {
  router.push("../add-funds/add-fiat");
}

export default function AddFiatButton() {
  return (
    <Pressable onPress={navigate}>
      <View borderWidth={1} borderRadius="$r5" borderColor="$borderNeutralSoft" padding={ms(16)} gap={ms(20)}>
        <View gap={ms(10)} flexDirection="row" alignItems="center">
          <View
            width={ms(50)}
            height={ms(50)}
            borderRadius="$r3"
            backgroundColor="$interactiveBaseBrandSoftDefault"
            justifyContent="center"
            alignItems="center"
          >
            <Banknote size={ms(24)} color="$iconBrandDefault" />
          </View>
          <View gap={ms(5)}>
            <Text fontSize={ms(17)} fontWeight="bold">
              Fiat On-Ramp
            </Text>
            <Text fontSize={ms(13)} color="$uiNeutralSecondary">
              International cards and banks.
            </Text>
          </View>
        </View>
        <View gap={ms(10)} flexDirection="row" justifyContent="space-between" alignItems="flex-start" width="100%">
          <View borderRadius="$r3" gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiNeutralSecondary" fontWeight="bold">
              Method
            </Text>
            <View flexDirection="row" gap={ms(2)}>
              <PiggyBank size={ms(24)} color="$iconSecondary" fontWeight="bold" />
              <CreditCard size={ms(24)} color="$iconSecondary" fontWeight="bold" />
            </View>
          </View>
          <View borderRadius="$r3" gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiNeutralSecondary" fontWeight="bold">
              Currencies
            </Text>
            <View flexDirection="row" gap={ms(2)}>
              <DollarSign size={ms(16)} color="$iconSecondary" fontWeight="bold" />
              <Euro size={ms(16)} color="$iconSecondary" fontWeight="bold" />
              <PoundSterling size={ms(16)} color="$iconSecondary" fontWeight="bold" />
            </View>
          </View>
          <View borderRadius="$r3" gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiNeutralSecondary" fontWeight="bold">
              Fees
            </Text>
            <Text fontSize={ms(13)} fontWeight="bold">
              2% - 5%
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
