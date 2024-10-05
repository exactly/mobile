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
      <View fullScreen gap={ms(20)} padded>
        <View alignItems="center" flexDirection="row" gap={ms(10)} justifyContent="space-between">
          {canGoBack() && (
            <Pressable onPress={back}>
              <ArrowLeft color="$uiNeutralPrimary" size={ms(24)} />
            </Pressable>
          )}
          <View alignItems="center" flexDirection="row">
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
