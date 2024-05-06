import "expo-webauthn";
import "../utils/polyfill";

import { createAlchemyPublicRpcClient } from "@alchemy/aa-alchemy";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Sentry from "@sentry/react-native";
import InterBold from "@tamagui/font-inter/otf/Inter-Bold.otf"; // eslint-disable-line import/no-unresolved
import Inter from "@tamagui/font-inter/otf/Inter-Medium.otf"; // eslint-disable-line import/no-unresolved
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { reconnect } from "@wagmi/core";
import { type FontSource, useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { TamaguiProvider } from "tamagui";
import { WagmiProvider, createConfig, custom } from "wagmi";

import metadata from "../package.json";
import tamaguiConfig from "../tamagui.config";
import alchemyConnector from "../utils/alchemyConnector";
import { alchemyAPIKey, chain } from "../utils/constants";
import handleError from "../utils/handleError";
import useOneSignal from "../utils/useOneSignal";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = { initialRouteName: "/" };

SplashScreen.preventAutoHideAsync().catch(handleError);

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  release: metadata.version,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1,
  attachStacktrace: true,
  attachViewHierarchy: true,
  autoSessionTracking: true,
});

const client = createAlchemyPublicRpcClient({ chain, connectionConfig: { apiKey: alchemyAPIKey } });

const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [alchemyConnector(client)],
  transports: { [chain.id]: custom(client) },
});
const queryClient = new QueryClient();

export default Sentry.wrap(function RootLayout() {
  const [loaded, error] = useFonts({
    Inter: Inter as FontSource,
    InterBold: InterBold as FontSource,
    ...FontAwesome.font,
  });

  useOneSignal();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(handleError);
  }, [loaded]);

  useEffect(() => {
    reconnect(wagmiConfig).catch(handleError);
  }, []);

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
