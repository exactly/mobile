import { router } from "expo-router";
import React from "react";
import { ms } from "react-native-size-matters";
import { Button, Text, View } from "tamagui";

import BaseLayout from "../shared/BaseLayout.js";
import SafeView from "../shared/SafeView.js";

const pressStyle = { backgroundColor: "$interactiveBaseBrandDefault", opacity: 0.9 };

const startOnboarding = () => {
  router.push("onboarding");
};

const Activity = () => {
  return (
    <SafeView>
      <BaseLayout flex={1}>
        <View gap={ms(40)}>
          <Text fontSize={40} fontFamily="$mono" fontWeight={700}>
            Activity
          </Text>
          <Button
            variant="outlined"
            backgroundColor="$interactiveBaseBrandDefault"
            color="$textInteractiveBaseBrandDefault"
            onPress={startOnboarding}
            fontWeight={600}
            pressStyle={pressStyle}
          >
            Start Onboarding
          </Button>
        </View>
      </BaseLayout>
    </SafeView>
  );
};

export default Activity;
