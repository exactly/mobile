import { ArrowLeft, Info } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
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
      <View gap={20} fullScreen padded>
        <View flexDirection="row" gap={10} justifyContent="space-between" alignItems="center">
          {canGoBack() && (
            <Pressable onPress={back}>
              <ArrowLeft size={24} color="$uiNeutralPrimary" />
            </Pressable>
          )}
          <View flexDirection="row" alignItems="center">
            <Text color="$uiNeutralSecondary" fontSize={15} fontWeight="bold">
              {`Add Funds / `}
            </Text>
            <Text fontSize={15} fontWeight="bold">
              Fiat
            </Text>
          </View>
          <Pressable>
            <Info color="$uiNeutralPrimary" />
          </Pressable>
        </View>
      </View>
      <ScrollView flex={1}>
        <View flex={1} gap={20} />
      </ScrollView>
    </SafeView>
  );
}
