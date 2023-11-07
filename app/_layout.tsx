import "react-native-get-random-values";

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
import { WagmiConfig, configureChains, createConfig, mainnet } from "wagmi";
import { publicProvider } from "wagmi/providers/public";

import metadata from "../package.json";
import tamaguiConfig from "../tamagui.config";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = { initialRouteName: "/" };

SplashScreen.preventAutoHideAsync();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  release: metadata.version,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 1.0,
  attachStacktrace: true,
  attachViewHierarchy: true,
  autoSessionTracking: true,
});

const chain = mainnet;
const { publicClient, webSocketPublicClient } = configureChains([chain], [publicProvider()]);
const wagmiConfig = createConfig({ autoConnect: true, publicClient, webSocketPublicClient });

export default function RootLayout() {
  // const colorScheme = useColorScheme();
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

  if (!loaded) return null;

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
