import { ArrowLeft } from "@tamagui/lucide-icons";
import { router, useRouter } from "expo-router";
import React from "react";
import { Pressable } from "react-native";
import { ms } from "react-native-size-matters";
import { ScrollView } from "tamagui";

import ContractUtils from "../../components/settings/ContractUtils";
import PasskeyUtils from "../../components/settings/PasskeyUtils";
import SafeView from "../../components/shared/SafeView";
import Text from "../../components/shared/Text";
import View from "../../components/shared/View";

export default function Beta() {
  const { canGoBack } = useRouter();
  return (
    <SafeView fullScreen tab>
      <View fullScreen gap="$s5" padded>
        <View alignItems="center" flexDirection="row" gap="$s3" justifyContent="space-around">
          <View left={0} position="absolute">
            {canGoBack() && (
              <Pressable
                onPress={() => {
                  router.back();
                }}
              >
                <ArrowLeft color="$uiNeutralPrimary" size={ms(24)} />
              </Pressable>
            )}
          </View>
          <Text color="$uiNeutralPrimary" emphasized subHeadline>
            Beta
          </Text>
        </View>
        <ScrollView flex={1}>
          <View gap="$s3">
            <PasskeyUtils />
            <ContractUtils />
          </View>
        </ScrollView>
      </View>
    </SafeView>
  );
}
