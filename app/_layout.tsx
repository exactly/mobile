import "expo-webauthn";
import "../utils/polyfill";

import { AlchemyProvider } from "@alchemy/aa-alchemy";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Sentry from "@sentry/react-native";
import InterBold from "@tamagui/font-inter/otf/Inter-Bold.otf";
import Inter from "@tamagui/font-inter/otf/Inter-Medium.otf";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { reconnect } from "@wagmi/core";
import BDOGrotesk_Bold from "../assets/fonts/BDOGrotesk-Bold.ttf";
import BDOGrotesk_Light from "../assets/fonts/BDOGrotesk-Light.ttf";
import BDOGrotesk_Medium from "../assets/fonts/BDOGrotesk-Medium.ttf";
import BDOGrotesk_Regular from "../assets/fonts/BDOGrotesk-Regular.ttf";
import IBMPlexMono_Regular from "../assets/fonts/IBMPlexMono-Regular.ttf";
import { type FontSource, useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
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

const provider = new AlchemyProvider({ apiKey: alchemyAPIKey, chain });
const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [alchemyConnector(provider)],
  transports: { [chain.id]: custom(provider) },
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
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    reconnect(wagmiConfig).catch(handleError);
  }, []);

  useFonts({
    BDOGrotesk: BDOGrotesk_Regular,
    "BDOGrotesk-Bold": BDOGrotesk_Bold,
    "BDOGrotesk-Light": BDOGrotesk_Light,
    "BDOGrotesk-Medium": BDOGrotesk_Medium,
    IBMPlexMono: IBMPlexMono_Regular,
  });

  if (!loaded) return;

  return (
    <>
      <StatusBar translucent={false} />
      <TamaguiProvider config={tamaguiConfig}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <Stack
              initialRouteName="home"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
            </Stack>
          </QueryClientProvider>
        </WagmiProvider>
      </TamaguiProvider>
    </>
  );
});
