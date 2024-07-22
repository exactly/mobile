import "../utils/polyfill.js";

import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { ReactNativeTracing, ReactNavigationInstrumentation, init, wrap } from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isRunningInExpoGo } from "expo";
import { Slot, useNavigationContainerRef } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { WagmiProvider } from "wagmi";

import metadata from "../../package.json";
import tamaguiConfig from "../../tamagui.config.js";
import useOneSignal from "../utils/useOneSignal.js";
import wagmiConfig from "../utils/wagmi.js";

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
const queryClient = new QueryClient();

export default wrap(function RootLayout() {
  const navigationContainer = useNavigationContainerRef();
  const colorScheme = useColorScheme();
  useOneSignal();

  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(navigationContainer);
  }, [navigationContainer]);

  return (
    <>
      <StatusBar translucent={false} />
      <TamaguiProvider config={tamaguiConfig}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView>
                <SafeAreaProvider>
                  <Slot />
                </SafeAreaProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </WagmiProvider>
        </ThemeProvider>
      </TamaguiProvider>
    </>
  );
});
