import { Stack, useNavigation } from "expo-router";
import { setBackgroundColorAsync } from "expo-system-ui";
import React, { useEffect } from "react";
import { useTheme } from "tamagui";

import handleError from "../../utils/handleError";

export default function OnboardingLayout() {
  const navigation = useNavigation();
  const theme = useTheme();
  useEffect(() => {
    navigation.setOptions({ contentStyle: { backgroundColor: theme.backgroundSoft.val } });
    setBackgroundColorAsync(theme.backgroundSoft.val).catch(handleError);
  }, [navigation, theme.backgroundSoft.val, theme]);
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(passkeys)/passkeys" />
      <Stack.Screen name="(passkeys)/about" options={{ presentation: "modal" }} />
    </Stack>
  );
}
