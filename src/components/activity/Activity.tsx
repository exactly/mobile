import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";
import { Text, View } from "tamagui";

import BaseLayout from "../shared/BaseLayout";
import Button from "../shared/Button";
import SafeView from "../shared/SafeView";

const startOnboarding = () => {
  router.push("onboarding");
};

export default function Activity() {
  return (
    <SafeView>
      <BaseLayout flex={1}>
        <View gap={ms(40)}>
          <Text fontSize={ms(40)} fontFamily="$mono" fontWeight={700}>
            Activity
          </Text>
          <Button contained onPress={startOnboarding}>
            Start Onboarding
          </Button>
        </View>
      </BaseLayout>
    </SafeView>
  );
}
