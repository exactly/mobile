import type { Passkey } from "@exactly/common/types";
import { useQuery } from "@tanstack/react-query";
import { Redirect, SplashScreen, Stack, useNavigation } from "expo-router";
import { setBackgroundColorAsync } from "expo-system-ui";
import React, { useEffect } from "react";
import { useTheme } from "tamagui";

import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";

export default function AppLayout() {
  const { error: noPasskey, isLoading, isFetched } = useQuery<Passkey>({ queryKey: ["passkey"] }, queryClient);
  const navigation = useNavigation();
  const theme = useTheme();
  useEffect(() => {
    if (isLoading || !isFetched) return;
    SplashScreen.hideAsync().catch(handleError);
  }, [isFetched, isLoading]);
  useEffect(() => {
    navigation.setOptions({ contentStyle: { backgroundColor: theme.backgroundSoft.val } });
    setBackgroundColorAsync(theme.backgroundSoft.val).catch(handleError);
  }, [navigation, theme.backgroundSoft.val, theme]);
  if (noPasskey) return <Redirect href="/onboarding" />;
  if (isLoading || !isFetched) return;
  return <Stack initialRouteName="(home)" screenOptions={{ headerShown: false }} />;
}
