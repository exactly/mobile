import { Banknote, CreditCard, DollarSign, Euro, PiggyBank, PoundSterling } from "@tamagui/lucide-icons";
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
      <View borderColor="$borderNeutralSoft" borderRadius="$r5" borderWidth={1} gap={ms(20)} padding={ms(16)}>
        <View alignItems="center" flexDirection="row" gap={ms(10)}>
          <View
            alignItems="center"
            backgroundColor="$interactiveBaseBrandSoftDefault"
            borderRadius="$r3"
            height={ms(50)}
            justifyContent="center"
            width={ms(50)}
          >
            <Banknote color="$iconBrandDefault" size={ms(24)} />
          </View>
          <View gap={ms(5)}>
            <Text fontSize={ms(17)} fontWeight="bold">
              Fiat On-Ramp
            </Text>
            <Text color="$uiNeutralSecondary" fontSize={ms(13)}>
              International cards and banks.
            </Text>
          </View>
        </View>
        <View alignItems="flex-start" flexDirection="row" gap={ms(10)} justifyContent="space-between" width="100%">
          <View borderRadius="$r3" gap={ms(5)}>
            <Text color="$uiNeutralSecondary" fontSize={ms(13)} fontWeight="bold">
              Method
            </Text>
            <View flexDirection="row" gap={ms(2)}>
              <PiggyBank color="$iconSecondary" fontWeight="bold" size={ms(24)} />
              <CreditCard color="$iconSecondary" fontWeight="bold" size={ms(24)} />
            </View>
          </View>
          <View borderRadius="$r3" gap={ms(5)}>
            <Text color="$uiNeutralSecondary" fontSize={ms(13)} fontWeight="bold">
              Currencies
            </Text>
            <View flexDirection="row" gap={ms(2)}>
              <DollarSign color="$iconSecondary" fontWeight="bold" size={ms(16)} />
              <Euro color="$iconSecondary" fontWeight="bold" size={ms(16)} />
              <PoundSterling color="$iconSecondary" fontWeight="bold" size={ms(16)} />
            </View>
          </View>
          <View borderRadius="$r3" gap={ms(5)}>
            <Text color="$uiNeutralSecondary" fontSize={ms(13)} fontWeight="bold">
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
