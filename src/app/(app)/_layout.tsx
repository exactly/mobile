import type { Passkey } from "@exactly/common/validation";
import { useQuery } from "@tanstack/react-query";
import { Redirect, SplashScreen, Stack } from "expo-router";
import React, { useEffect } from "react";

import queryClient from "../../utils/queryClient";
import reportError from "../../utils/reportError";
import useBackgroundColor from "../../utils/useBackgroundColor";

export default function AppLayout() {
  const { error: noPasskey, isLoading, isFetched } = useQuery<Passkey>({ queryKey: ["passkey"] }, queryClient);
  useBackgroundColor();
  useEffect(() => {
    if (isLoading || !isFetched) return;
    SplashScreen.hideAsync().catch(reportError);
  }, [isFetched, isLoading]);
  if (noPasskey) return <Redirect href="/onboarding" />;
  if (isLoading || !isFetched) return;
  return <Stack initialRouteName="(home)" screenOptions={{ headerShown: false }} />;
}
