import { ArrowLeft, Info } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import AddCryptoButton from "./AddCryptoButton";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function back() {
  router.back();
}

export default function AddFunds() {
  const { canGoBack } = router;
  return (
    <SafeView fullScreen>
      <View gap={ms(20)} fullScreen padded>
        <View gap={ms(20)}>
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
            <View flex={1}>
              <Text color="$uiNeutralPlaceholder" fontSize={ms(13)}>
                Assets are added to your balance as collateral to increase your credit limit. You can change collateral
                preferences in your account.{" "}
                <Text color="$uiBrandSecondary" fontSize={ms(13)} fontWeight="bold">
                  Learn more about collateral.
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
