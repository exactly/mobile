import { ArrowLeft, Info } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, View } from "tamagui";

import AddCryptoButton from "./AddCryptoButton";
import AddFiatButton from "./AddFiatButton";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";

function back() {
  router.back();
}

export default function AddFunds() {
  const { canGoBack } = router;
  return (
    <SafeView paddingBottom={0}>
      <BaseLayout width="100%" height="100%">
        <View gap={ms(20)} paddingVertical={ms(20)}>
          <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
            {canGoBack() && (
              <Pressable onPress={back}>
                <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
              </Pressable>
            )}
            <Text fontSize={ms(15)} fontWeight="bold">
              Add Funds
            </Text>
            <Pressable>
              <Info color="$uiNeutralPrimary" />
            </Pressable>
          </View>
        </View>
        <ScrollView flex={1}>
          <View flex={1} gap={ms(20)}>
            <AddCryptoButton />
            <AddFiatButton />
            <View flex={1}>
              <Text color="$uiNeutralPlaceholder">
                Assets are added to your balance as collateral to increase your credit limit. You can change collateral
                preferences in your account.{" "}
                <Text color="$uiBrandSecondary" fontSize={ms(13)} fontWeight="bold">
                  Learn more about collateral.
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </BaseLayout>
    </SafeView>
  );
}
