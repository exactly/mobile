import { router } from "expo-router";
import { ArrowLeft, Info } from "phosphor-react-native";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Text, View, useTheme } from "tamagui";

import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

function back() {
  router.back();
}

export default function AddFiat() {
  const theme = useTheme();
  const { canGoBack } = router;
  return (
    <SafeView>
      <BaseLayout width="100%" height="100%">
        <View gap={ms(20)} paddingVertical={ms(20)}>
          <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
            {canGoBack() && (
              <Pressable onPress={back}>
                <ArrowLeft size={ms(24)} color={theme.uiNeutralPrimary.get()} />
              </Pressable>
            )}
            <View flexDirection="row" alignItems="center">
              <Text color="$uiNeutralSecondary" fontSize={ms(15)} fontWeight="bold">
                Add Funds /{" "}
              </Text>
              <Text color="$uiPrimary" fontSize={ms(15)} fontWeight="bold">
                Fiat
              </Text>
            </View>
            <Pressable>
              <Info color={theme.uiNeutralPrimary.get()} />
            </Pressable>
          </View>
        </View>
        <ScrollView flex={1}>
          <View flex={1} gap={ms(20)} />
        </ScrollView>
      </BaseLayout>
    </SafeView>
  );
}
