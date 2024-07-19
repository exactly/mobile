import { router } from "expo-router";
import { ArrowLeft, Info } from "phosphor-react-native";
import React from "react";
import { TouchableOpacity } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Text, View, useTheme } from "tamagui";

import Cryptocurrency from "./Cryptocurrency";
import FiatOnRamp from "./FiatOnRamp";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

function back() {
  router.back();
}

export default function AddFunds() {
  const theme = useTheme();
  const { canGoBack } = router;
  return (
    <SafeView paddingBottom={0}>
      <BaseLayout width="100%" height="100%">
        <View gap={ms(20)} paddingVertical={ms(20)}>
          <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
            {canGoBack() && (
              <TouchableOpacity onPress={back}>
                <ArrowLeft size={ms(24)} color={theme.uiPrimary.get() as string} />
              </TouchableOpacity>
            )}
            <Text color="uiPrimary" fontSize={ms(15)} fontWeight="bold">
              Add Funds
            </Text>
            <TouchableOpacity>
              <Info color={theme.uiPrimary.get() as string} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView flex={1}>
          <View flex={1} gap={ms(20)}>
            <Cryptocurrency />
            <FiatOnRamp />
            <View flex={1}>
              <Text color="$uiNeutralPlaceholder">
                Assets are added to your balance as collateral to increase your credit limit. You can change collateral
                preferences in your account.{" "}
                <Text color={theme.uiBrandSecondary.get() as string} fontSize={ms(13)} fontWeight="bold">
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
