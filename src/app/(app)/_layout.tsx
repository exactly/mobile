import type { Passkey } from "@exactly/common/types";
import { useQuery } from "@tanstack/react-query";
import { Redirect, Slot, SplashScreen } from "expo-router";
import React, { useEffect } from "react";

import handleError from "../../utils/handleError";
import queryClient from "../../utils/queryClient";

export default function AppLayout() {
  const { error: noPasskey, isLoading, isFetched } = useQuery<Passkey>({ queryKey: ["passkey"] }, queryClient);

  useEffect(() => {
    if (isLoading || !isFetched) return;
    SplashScreen.hideAsync().catch(handleError);
  }, [isFetched, isLoading]);

  if (noPasskey) return <Redirect href="/onboarding" />;
  if (isLoading || !isFetched) return;
  return <Slot />;
}
