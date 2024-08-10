import "../utils/polyfill";

import { ReactNativeTracing, ReactNavigationInstrumentation, init, wrap } from "@sentry/react-native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { isRunningInExpoGo } from "expo";
import { type FontSource, useFonts } from "expo-font";
import { Slot, SplashScreen, useNavigationContainerRef } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { WagmiProvider } from "wagmi";

import tamagui from "../../tamagui.config";
import BDOGroteskBold from "../assets/fonts/BDOGrotesk-Bold.otf";
import BDOGroteskRegular from "../assets/fonts/BDOGrotesk-Regular.otf";
import IBMPlexMonoBold from "../assets/fonts/IBMPlexMono-Bold.otf";
import IBMPlexMonoRegular from "../assets/fonts/IBMPlexMono-Regular.otf";
import IBMPlexMonoSemiBold from "../assets/fonts/IBMPlexMono-SemiBold.otf";
import ThemeProvider from "../components/context/ThemeProvider";
import version from "../generated/version";
import handleError from "../utils/handleError";
import queryClient, { persister } from "../utils/queryClient";
import useOneSignal from "../utils/useOneSignal";
import wagmiConfig from "../utils/wagmi";

SplashScreen.preventAutoHideAsync().catch(handleError);

export const unstable_settings = { initialRouteName: "(app)" };

export { ErrorBoundary } from "expo-router";
const routingInstrumentation = new ReactNavigationInstrumentation();
init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  release: `v${version}`,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1,
  attachStacktrace: true,
  attachViewHierarchy: true,
  autoSessionTracking: true,
  integrations: [new ReactNativeTracing({ routingInstrumentation, enableNativeFramesTracking: !isRunningInExpoGo() })],
});
const useServerFonts = typeof window === "undefined" ? useFonts : () => {};

export default wrap(function RootLayout() {
  const navigationContainer = useNavigationContainerRef();
  useOneSignal();
  useServerFonts({
    "BDOGrotesk-Bold": BDOGroteskBold as FontSource,
    "BDOGrotesk-Regular": BDOGroteskRegular as FontSource,
    "IBMPlexMono-Bold": IBMPlexMonoBold as FontSource,
    "IBMPlexMono-Regular": IBMPlexMonoRegular as FontSource,
    "IBMPlexMono-SemiBold": IBMPlexMonoSemiBold as FontSource,
  });
  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(navigationContainer);
  }, [navigationContainer]);
  return (
    <>
      <StatusBar translucent={false} />
      <TamaguiProvider config={tamagui}>
        <ThemeProvider>
          <WagmiProvider config={wagmiConfig}>
            <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
              <SafeAreaProvider>
                <Slot />
              </SafeAreaProvider>
            </PersistQueryClientProvider>
          </WagmiProvider>
        </ThemeProvider>
      </TamaguiProvider>
    </>
  );
});
