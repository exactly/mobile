import "../utils/polyfill";
import "../webauthn/dist";

import { AlchemyProvider } from "@alchemy/aa-alchemy";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import InterBold from "@tamagui/font-inter/otf/Inter-Bold.otf";
import Inter from "@tamagui/font-inter/otf/Inter-Medium.otf";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { reconnect } from "@wagmi/core";
import { type FontSource, useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { OneSignal } from "react-native-onesignal";
import * as Sentry from "sentry-expo";
import { TamaguiProvider } from "tamagui";
import { WagmiProvider, createConfig, custom } from "wagmi";

import metadata from "../package.json";
import tamaguiConfig from "../tamagui.config";
import alchemyConnector from "../utils/alchemyConnector";
import { alchemyAPIKey, chain, oneSignalAPPId } from "../utils/constants";
import handleError from "../utils/handleError";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = { initialRouteName: "/" };

SplashScreen.preventAutoHideAsync();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  release: metadata.version,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1,
  attachStacktrace: true,
  attachViewHierarchy: true,
  autoSessionTracking: true,
});

if (oneSignalAPPId) {
  OneSignal.initialize(oneSignalAPPId);
}

const provider = new AlchemyProvider({ apiKey: alchemyAPIKey, chain });
const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [alchemyConnector(provider)],
  transports: { [chain.id]: custom(provider) },
});
const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter: Inter as FontSource,
    InterBold: InterBold as FontSource,
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    reconnect(wagmiConfig).catch(handleError);
    if (oneSignalAPPId) OneSignal.login("0000000");
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
}
