import "../utils/polyfill";

import { createAlchemyPublicRpcClient } from "@alchemy/aa-alchemy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { ReactNativeTracing, ReactNavigationInstrumentation, init, wrap } from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isRunningInExpoGo } from "expo";
import { type FontSource, useFonts } from "expo-font";
import { Slot, SplashScreen, useNavigationContainerRef } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { useColorScheme } from "react-native";
import { TamaguiProvider } from "tamagui";
import { WagmiProvider, createConfig, createStorage, custom } from "wagmi";

import { alchemyAPIKey, chain } from "@exactly/common/constants";

import metadata from "../../package.json";
import tamaguiConfig from "../../tamagui.config";
import BDOGroteskBold from "../assets/fonts/BDOGrotesk-Bold.otf";
import BDOGroteskRegular from "../assets/fonts/BDOGrotesk-Regular.otf";
import IBMPlexMonoBold from "../assets/fonts/IBMPlexMono-Bold.otf";
import IBMPlexMonoRegular from "../assets/fonts/IBMPlexMono-Regular.otf";
import IBMPlexMonoSemiBold from "../assets/fonts/IBMPlexMono-SemiBold.otf";
import alchemyConnector from "../utils/alchemyConnector";
import handleError from "../utils/handleError";
import useOneSignal from "../utils/useOneSignal";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = { initialRouteName: "index" };

SplashScreen.preventAutoHideAsync().catch(handleError);
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

const publicClient = createAlchemyPublicRpcClient({ chain, connectionConfig: { apiKey: alchemyAPIKey } });
const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [alchemyConnector(publicClient)],
  transports: { [chain.id]: custom(publicClient) },
  storage: createStorage({ storage: AsyncStorage }),
  multiInjectedProviderDiscovery: false,
});
const queryClient = new QueryClient();

export default wrap(function RootLayout() {
  const navigationContainer = useNavigationContainerRef();
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    BDOGroteskBold: BDOGroteskBold as FontSource,
    BDOGroteskRegular: BDOGroteskRegular as FontSource,
    IBMPlexMonoBold: IBMPlexMonoBold as FontSource,
    IBMPlexMonoRegular: IBMPlexMonoRegular as FontSource,
    IBMPlexMonoSemiBold: IBMPlexMonoSemiBold as FontSource,
    unset: BDOGroteskRegular as FontSource,
  });

  useOneSignal();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(handleError);
  }, [loaded]);

  useEffect(() => {
    routingInstrumentation.registerNavigationContainer(navigationContainer);
  }, [navigationContainer]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return;

  return (
    <>
      <StatusBar translucent={false} />
      <TamaguiProvider config={tamaguiConfig}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
              <Slot />
            </QueryClientProvider>
          </WagmiProvider>
        </ThemeProvider>
      </TamaguiProvider>
    </>
  );
});
