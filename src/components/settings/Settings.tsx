import { ArrowLeft } from "@tamagui/lucide-icons";
import { router, useRouter } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import ContractUtils from "./ContractUtils";
import PasskeyUtils from "./PasskeyUtils";
import SafeView from "../shared/SafeView";
import Text from "../shared/Text";
import View from "../shared/View";

function back() {
  router.back();
}

export default function Settings() {
  const { canGoBack } = useRouter();
  return (
    <SafeView fullScreen tab>
      <View fullScreen padded gap={ms(20)}>
        <View flexDirection="row" gap={ms(10)} justifyContent="space-around" alignItems="center">
          <View position="absolute" left={0}>
            {canGoBack() && (
              <Pressable onPress={back}>
                <ArrowLeft size={ms(24)} color="$uiNeutralPrimary" />
              </Pressable>
            )}
          </View>
          <Text color="$uiNeutralPrimary" fontSize={ms(15)} fontWeight="bold">
            Settings
          </Text>
        </View>
        <ScrollView flex={1}>
          <View gap={ms(10)}>
            <PasskeyUtils />
            <ContractUtils />
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
