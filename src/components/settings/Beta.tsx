import { ArrowLeft } from "@tamagui/lucide-icons";
import { router, useRouter } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ScrollView } from "tamagui";

import ContractUtils from "../../components/settings/ContractUtils";
import SafeView from "../../components/shared/SafeView";
import Text from "../../components/shared/Text";
import View from "../../components/shared/View";

export default function Beta() {
  const { canGoBack } = useRouter();
  return (
    <SafeView fullScreen tab>
      <View fullScreen padded gap="$s5">
        <View flexDirection="row" gap="$s3" justifyContent="space-around" alignItems="center">
          <View position="absolute" left={0}>
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <ArrowLeft size={24} color="$uiNeutralPrimary" />
              </Pressable>
            )}
          </View>
          <Text emphasized subHeadline color="$uiNeutralPrimary">
            Beta
          </Text>
        </View>
        <ScrollView flex={1}>
          <View gap="$s3">
            <ContractUtils />
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
