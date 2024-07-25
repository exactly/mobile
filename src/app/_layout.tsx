import "../utils/polyfill";

import { ReactNativeTracing, ReactNavigationInstrumentation, init, wrap } from "@sentry/react-native";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { isRunningInExpoGo } from "expo";
import { type FontSource, useFonts } from "expo-font";
import { Slot, SplashScreen, router, useNavigationContainerRef } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { WagmiProvider } from "wagmi";

import metadata from "../../package.json";
import tamaguiConfig from "../../tamagui.config";
import BDOGroteskBold from "../assets/fonts/BDOGrotesk-Bold.otf";
import BDOGroteskRegular from "../assets/fonts/BDOGrotesk-Regular.otf";
import IBMPlexMonoBold from "../assets/fonts/IBMPlexMono-Bold.otf";
import IBMPlexMonoRegular from "../assets/fonts/IBMPlexMono-Regular.otf";
import IBMPlexMonoSemiBold from "../assets/fonts/IBMPlexMono-SemiBold.otf";
import usePreviewerStore from "../stores/usePreviewerStore";
import handleError from "../utils/handleError";
import loadPasskey from "../utils/loadPasskey";
import queryClient from "../utils/queryClient";
import useOneSignal from "../utils/useOneSignal";
import wagmiConfig from "../utils/wagmi";

SplashScreen.preventAutoHideAsync().catch(handleError);

export { ErrorBoundary } from "expo-router";
export const unstable_settings = { initialRouteName: "(tabs)" };
const routingInstrumentation = new ReactNavigationInstrumentation();
init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  release: metadata.version,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1,
  attachStacktrace: true,
  attachViewHierarchy: true,
  autoSessionTracking: true,
  integrations: [new ReactNativeTracing({ routingInstrumentation, enableNativeFramesTracking: !isRunningInExpoGo() })],
});
const useServerFonts = typeof window === "undefined" ? useFonts : () => {};
queryClient.prefetchQuery({ queryKey: ["passkey"], queryFn: loadPasskey }).catch(handleError);

export default wrap(function App() {
  const navigationContainer = useNavigationContainerRef();
  const fetch = usePreviewerStore((state) => state.fetch);
  useOneSignal();
  useServerFonts({
    "BDOGrotesk-Bold": BDOGroteskBold as FontSource,
    "BDOGrotesk-Regular": BDOGroteskRegular as FontSource,
    "IBMPlexMono-Bold": IBMPlexMonoBold as FontSource,
    "IBMPlexMono-Regular": IBMPlexMonoRegular as FontSource,
    "IBMPlexMono-SemiBold": IBMPlexMonoSemiBold as FontSource,
  });

  queryClient
    .fetchQuery({ queryKey: ["passkey"], queryFn: loadPasskey })
    .catch(() => {
      router.replace("onboarding");
    })
    .finally(() => {
      SplashScreen.hideAsync().catch(handleError);
    });

  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(navigationContainer);
  }, [navigationContainer]);

  useEffect(() => {
    fetch().catch(handleError);
  }, [fetch]);

  return (
    <>
      <StatusBar translucent={false} />
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <SafeAreaProvider>
                <Slot />
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </WagmiProvider>
      </TamaguiProvider>
    </>
  );
});
