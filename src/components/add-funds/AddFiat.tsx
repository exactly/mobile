import { ArrowLeft, Info } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function back() {
  router.back();
}

export default function AddFiat() {
  const { canGoBack } = router;
  return (
    <SafeView fullScreen>
      <View gap={ms(20)} fullScreen padded>
        <View flexDirection="row" gap={ms(10)} justifyContent="space-between" alignItems="center">
          {canGoBack() && (
            <Pressable onPress={back}>
              <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
            </Pressable>
          )}
          <View flexDirection="row" alignItems="center">
            <Text color="$uiNeutralSecondary" fontSize={ms(15)} fontWeight="bold">
              {`Add Funds / `}
            </Text>
            <Text fontSize={ms(15)} fontWeight="bold">
              Fiat
            </Text>
          </View>
          <Pressable>
            <Info color="$uiNeutralPrimary" />
          </Pressable>
        </View>
      </View>
      <ScrollView flex={1}>
        <View flex={1} gap={ms(20)} />
      </ScrollView>
    </SafeView>
  );
}
