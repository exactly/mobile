import { ArrowRight } from "@tamagui/lucide-icons";
import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";
import { Text, View } from "tamagui";

import SuccessImage from "../../assets/images/account-created.svg";
import Blob from "../../assets/images/onboarding-blob-06.svg";
import ActionButton from "../shared/ActionButton";
import BaseLayout from "../shared/BaseLayout";
import SafeView from "../shared/SafeView";

export default function Success() {
  return (
    <SafeView>
      <BaseLayout flex={1}>
        <View flex={1}>
          <View alignItems="center" alignContent="center" justifyContent="center" height="100%" flex={1}>
            <View position="absolute">
              <Blob />
            </View>
            <View position="absolute">
              <SuccessImage />
            </View>
          </View>

          <View flexDirection="column" paddingVertical={ms(10)} paddingHorizontal={ms(20)} gap={ms(40)}>
            <Text fontSize={ms(28)} fontWeight={700} color="$interactiveBaseBrandDefault" textAlign="center">
              Account created successfully!
            </Text>

            <View flexDirection="column" gap={ms(10)} paddingBottom={ms(30)}>
              <ActionButton
                onPress={() => {
                  // TODO Implement account setup
                  router.replace("/(app)");
                }}
                iconAfter={<ArrowRight color="$interactiveOnBaseBrandDefault" />}
              >
                Start account setup
              </ActionButton>
            </View>
          </View>
        </View>
      </BaseLayout>
    </SafeView>
  );
}
