import { optimism } from "@alchemy/aa-core";
import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import release from "@exactly/common/generated/release";
import sentryDSN from "@exactly/common/sentryDSN";
import { createConfig } from "@lifi/sdk";
import { init, mobileReplayIntegration, reactNavigationIntegration, wrap } from "@sentry/react-native";
import { ToastProvider } from "@tamagui/toast";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { isRunningInExpoGo } from "expo";
import { useAssets } from "expo-asset";
import { type FontSource, useFonts } from "expo-font";
import { SplashScreen, Stack, useNavigationContainerRef } from "expo-router";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WagmiProvider } from "wagmi";

import BDOGroteskBold from "../assets/fonts/BDOGrotesk-Bold.otf";
import BDOGroteskRegular from "../assets/fonts/BDOGrotesk-Regular.otf";
import IBMPlexMonoBold from "../assets/fonts/IBMPlexMono-Bold.otf";
import IBMPlexMonoRegular from "../assets/fonts/IBMPlexMono-Regular.otf";
import IBMPlexMonoSemiBold from "../assets/fonts/IBMPlexMono-SemiBold.otf";
import AppIcon from "../assets/icon.png";
import { OnboardingProvider } from "../components/context/OnboardingProvider";
import ThemeProvider from "../components/context/ThemeProvider";
import handleError from "../utils/handleError";
import publicClient from "../utils/publicClient";
import queryClient, { persister } from "../utils/queryClient";
import wagmiConfig from "../utils/wagmi";

SplashScreen.preventAutoHideAsync().catch(handleError);

export { ErrorBoundary } from "expo-router";
const routingInstrumentation = reactNavigationIntegration();
init({
  release,
  dsn: sentryDSN,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1,
  attachStacktrace: true,
  attachViewHierarchy: true,
  autoSessionTracking: true,
  enableNativeFramesTracking: !isRunningInExpoGo(),
  enableUserInteractionTracing: true,
  integrations: [routingInstrumentation, ...(__DEV__ ? [] : [mobileReplayIntegration()])],
  _experiments: __DEV__ ? undefined : { replaysOnErrorSampleRate: 1, replaysSessionSampleRate: 0.01 },
  spotlight: __DEV__,
});
const useServerFonts = typeof window === "undefined" ? useFonts : () => undefined;
const useServerAssets = typeof window === "undefined" ? useAssets : () => undefined;
const devtools = !!JSON.parse(process.env.EXPO_PUBLIC_DEVTOOLS ?? "false");
createConfig({
  integrator: "exa_app",
  rpcUrls: {
    [optimism.id]: [`${optimism.rpcUrls.alchemy?.http[0]}/${alchemyAPIKey}`],
    [chain.id]: [publicClient.transport.url],
  },
});

export default wrap(function RootLayout() {
  const navigationContainer = useNavigationContainerRef();

  useServerFonts({
    "BDOGrotesk-Bold": BDOGroteskBold as FontSource,
    "BDOGrotesk-Regular": BDOGroteskRegular as FontSource,
    "IBMPlexMono-Bold": IBMPlexMonoBold as FontSource,
    "IBMPlexMono-Regular": IBMPlexMonoRegular as FontSource,
    "IBMPlexMono-SemiBold": IBMPlexMonoSemiBold as FontSource,
  });
  useServerAssets([AppIcon]);
  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(navigationContainer);
  }, [navigationContainer]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <ToastProvider>
          <SafeAreaProvider>
            <ThemeProvider>
              <OnboardingProvider>
                <Stack initialRouteName="(app)" screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(app)" />
                  <Stack.Screen name="onboarding" />
                </Stack>
              </OnboardingProvider>
            </ThemeProvider>
          </SafeAreaProvider>
          {devtools && <ReactQueryDevtools initialIsOpen={false} client={queryClient} />}
        </ToastProvider>
      </PersistQueryClientProvider>
    </WagmiProvider>
  );
});
