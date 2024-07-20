import { router } from "expo-router";
import { Bank, CreditCard, CurrencyDollar, CurrencyEur, CurrencyGbp, Money } from "phosphor-react-native";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { View, Text, useTheme } from "tamagui";

function navigate() {
  router.push("add-funds/add-fiat");
}

export default function AddFiatButton() {
  const theme = useTheme();
  return (
    <Pressable onPress={navigate}>
      <View borderWidth={1} borderRadius={16} borderColor="$borderNeutralSoft" padding={ms(16)} gap={ms(20)}>
        <View gap={ms(10)} flexDirection="row" alignItems="center">
          <View
            width={ms(50)}
            height={ms(50)}
            borderRadius={ms(8)}
            backgroundColor="$interactiveBaseBrandSoftDefault"
            justifyContent="center"
            alignItems="center"
          >
            <Money size={ms(24)} color={theme.iconBrand.get() as string} />
          </View>
          <View gap={ms(5)}>
            <Text fontSize={ms(17)} color="$textPrimary" fontWeight="bold">
              Fiat On-Ramp
            </Text>
            <Text fontSize={ms(13)} color="$textSecondary">
              International cards and banks.
            </Text>
          </View>
        </View>
        <View gap={ms(10)} flexDirection="row" justifyContent="space-between" alignItems="flex-start" width="100%">
          <View borderRadius={ms(8)} gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiSecondary" fontWeight="bold">
              Method
            </Text>
            <View flexDirection="row" gap={ms(2)}>
              <Bank size={ms(24)} color={theme.iconSecondary.get() as string} weight="bold" />
              <CreditCard size={ms(24)} color={theme.iconSecondary.get() as string} weight="bold" />
            </View>
          </View>
          <View borderRadius={ms(8)} gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiSecondary" fontWeight="bold">
              Currencies
            </Text>
            <View flexDirection="row" gap={ms(2)}>
              <CurrencyDollar size={ms(16)} color={theme.iconSecondary.get() as string} weight="bold" />
              <CurrencyEur size={ms(16)} color={theme.iconSecondary.get() as string} weight="bold" />
              <CurrencyGbp size={ms(16)} color={theme.iconSecondary.get() as string} weight="bold" />
            </View>
          </View>
          <View borderRadius={ms(8)} gap={ms(5)}>
            <Text fontSize={ms(13)} color="$uiSecondary" fontWeight="bold">
              Fees
            </Text>
            <Text fontSize={ms(13)} color="$uiPrimary" fontWeight="bold">
              2% - 5%
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
