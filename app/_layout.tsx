import "expo-webauthn";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import InterBold from "@tamagui/font-inter/otf/Inter-Bold.otf";
import Inter from "@tamagui/font-inter/otf/Inter-Medium.otf";
import { type FontSource, useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import * as Sentry from "sentry-expo";
import { TamaguiProvider } from "tamagui";
import { TextEncoder } from "text-encoding";
import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";

import metadata from "../package.json";
import tamaguiConfig from "../tamagui.config";
import AlchemyConnector from "../utils/AlchemyConnector";
import { alchemyAPIKey, chain } from "../utils/constants";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = { initialRouteName: "/" };

void SplashScreen.preventAutoHideAsync(); // eslint-disable-line no-void -- android bug

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  release: metadata.version,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1,
  attachStacktrace: true,
  attachViewHierarchy: true,
  autoSessionTracking: true,
});

const { publicClient, webSocketPublicClient } = configureChains(
  [chain],
  [alchemyAPIKey ? alchemyProvider({ apiKey: alchemyAPIKey }) : publicProvider()],
);
const wagmiConfig = createConfig({ connectors: [new AlchemyConnector()], publicClient, webSocketPublicClient });

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
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return;

  return (
    <>
      <StatusBar translucent={false} />
      <TamaguiProvider config={tamaguiConfig}>
        <WagmiConfig config={wagmiConfig}>
          <Slot />
        </WagmiConfig>
      </TamaguiProvider>
    </>
  );
}

global.TextEncoder ??= TextEncoder; // eslint-disable-line @typescript-eslint/no-unnecessary-condition -- polyfill
