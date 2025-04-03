import { PiggyBank, CreditCard, DollarSign, Euro, PoundSterling, Banknote } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { View } from "tamagui";

import Text from "../shared/Text";

function navigate() {
  router.push("../add-funds/add-fiat");
}

export default function AddFiatButton() {
  return (
    <Pressable onPress={navigate}>
      <View borderWidth={1} borderRadius="$r5" borderColor="$borderNeutralSoft" padding={16} gap={20}>
        <View gap={10} flexDirection="row" alignItems="center">
          <View
            width={50}
            height={50}
            borderRadius="$r3"
            backgroundColor="$interactiveBaseBrandSoftDefault"
            justifyContent="center"
            alignItems="center"
          >
            <Banknote size={24} color="$iconBrandDefault" />
          </View>
          <View gap={5}>
            <Text fontSize={17} fontWeight="bold">
              Fiat On-Ramp
            </Text>
            <Text fontSize={13} color="$uiNeutralSecondary">
              International cards and banks.
            </Text>
          </View>
        </View>
        <View gap={10} flexDirection="row" justifyContent="space-between" alignItems="flex-start" width="100%">
          <View borderRadius="$r3" gap={5}>
            <Text fontSize={13} color="$uiNeutralSecondary" fontWeight="bold">
              Method
            </Text>
            <View flexDirection="row" gap={2}>
              <PiggyBank size={24} color="$iconSecondary" fontWeight="bold" />
              <CreditCard size={24} color="$iconSecondary" fontWeight="bold" />
            </View>
          </View>
          <View borderRadius="$r3" gap={5}>
            <Text fontSize={13} color="$uiNeutralSecondary" fontWeight="bold">
              Currencies
            </Text>
            <View flexDirection="row" gap={2}>
              <DollarSign size={16} color="$iconSecondary" fontWeight="bold" />
              <Euro size={16} color="$iconSecondary" fontWeight="bold" />
              <PoundSterling size={16} color="$iconSecondary" fontWeight="bold" />
            </View>
          </View>
          <View borderRadius="$r3" gap={5}>
            <Text fontSize={13} color="$uiNeutralSecondary" fontWeight="bold">
              Fees
            </Text>
            <Text fontSize={13} fontWeight="bold">
              2% - 5%
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
