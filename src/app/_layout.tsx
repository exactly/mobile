import "expo-webauthn";
import "../utils/polyfill";

import { createAlchemyPublicRpcClient } from "@alchemy/aa-alchemy";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReactNativeTracing, ReactNavigationInstrumentation, init, wrap } from "@sentry/react-native";
import InterBold from "@tamagui/font-inter/otf/Inter-Bold.otf"; // eslint-disable-line import/no-unresolved
import Inter from "@tamagui/font-inter/otf/Inter-Medium.otf"; // eslint-disable-line import/no-unresolved
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isRunningInExpoGo } from "expo";
import { type FontSource, useFonts } from "expo-font";
import { Slot, SplashScreen, useNavigationContainerRef } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { TamaguiProvider } from "tamagui";
import { WagmiProvider, createConfig, createStorage, custom } from "wagmi";

import { chain } from "@exactly/common/constants";

import metadata from "../../package.json";
import tamaguiConfig from "../../tamagui.config";
import { alchemyAPIKey } from "../constants";
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
  const [loaded, error] = useFonts({
    Inter: Inter as FontSource,
    InterBold: InterBold as FontSource,
    ...FontAwesome.font,
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
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <Slot />
          </QueryClientProvider>
        </WagmiProvider>
      </TamaguiProvider>
    </>
  );
});
