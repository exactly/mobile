import { router } from "expo-router";
import { ArrowLeft, Info } from "phosphor-react-native";
import React from "react";
import { TouchableOpacity } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView, Text, View, useTheme } from "tamagui";

import BaseLayout from "../shared/BaseLayout.js";
import SafeView from "../shared/SafeView.js";

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
              <TouchableOpacity onPress={back}>
                <ArrowLeft size={ms(24)} color={theme.uiPrimary.get() as string} />
              </TouchableOpacity>
            )}
            <View flexDirection="row" alignItems="center">
              <Text color="$uiSecondary" fontSize={ms(15)} fontWeight="bold">
                Add Funds /{" "}
              </Text>
              <Text color="$uiPrimary" fontSize={ms(15)} fontWeight="bold">
                Fiat
              </Text>
            </View>
            <TouchableOpacity>
              <Info color={theme.uiPrimary.get() as string} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView flex={1}>
          <View flex={1} gap={ms(20)} />
        </ScrollView>
      </BaseLayout>
    </SafeView>
  );
}
