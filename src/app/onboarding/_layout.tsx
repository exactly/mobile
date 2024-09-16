import { Stack } from "expo-router";
import React from "react";

import useBackgroundColor from "../../utils/useBackgroundColor";

export default function OnboardingLayout() {
  useBackgroundColor();
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(passkeys)/passkeys" />
      <Stack.Screen name="(passkeys)/about" options={{ presentation: "modal" }} />
    </Stack>
  );
}
