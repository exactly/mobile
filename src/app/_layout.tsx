import { optimism } from "@alchemy/aa-core";
import alchemyAPIKey from "@exactly/common/alchemyAPIKey";
import chain from "@exactly/common/generated/chain";
import release from "@exactly/common/generated/release";
import sentryDSN from "@exactly/common/sentryDSN";
import { createConfig, EVM } from "@lifi/sdk";
import {
  ErrorBoundary,
  feedbackIntegration,
  init,
  mobileReplayIntegration,
  reactNavigationIntegration,
  wrap,
} from "@sentry/react-native";
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
import Error from "../components/shared/Error";
import publicClient from "../utils/publicClient";
import queryClient, { persister } from "../utils/queryClient";
import reportError from "../utils/reportError";
import wagmiConfig from "../utils/wagmi";

SplashScreen.preventAutoHideAsync().catch(reportError);

export { ErrorBoundary } from "expo-router";
const routingInstrumentation = reactNavigationIntegration({ enableTimeToInitialDisplay: !isRunningInExpoGo() });
const userFeedback = feedbackIntegration({
  showName: false,
  showEmail: false,
  showBranding: false,
  formTitle: "Send report error",
  messageLabel: "Describe the issue",
  messagePlaceholder: "",
  submitButtonLabel: "Send report",
  cancelButtonLabel: "Cancel",
  styles: {
    container: { gap: 12, padding: 16 },
    label: { fontWeight: 600 },
    textArea: { minHeight: 150, borderWidth: 1, borderColor: "#CCCCCC", borderRadius: 5 },
    input: { borderWidth: 1, borderRadius: 5, padding: 5, color: "#000000" },
    submitButton: {
      height: 50,
      borderRadius: 5,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#12A594",
    },
    cancelButton: {
      height: 50,
      borderRadius: 5,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
  },
});
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
  integrations: [routingInstrumentation, ...(__DEV__ ? [] : [mobileReplayIntegration()]), userFeedback],
  _experiments: __DEV__ ? undefined : { replaysOnErrorSampleRate: 1, replaysSessionSampleRate: 0.01 },
  spotlight: __DEV__,
});
const useServerFonts = typeof window === "undefined" ? useFonts : () => undefined;
const useServerAssets = typeof window === "undefined" ? useAssets : () => undefined;
const devtools = !!JSON.parse(process.env.EXPO_PUBLIC_DEVTOOLS ?? "false");
createConfig({
  integrator: "exa_app",
  providers: [EVM({ getWalletClient: () => Promise.resolve(publicClient) })],
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
                <ErrorBoundary
                  fallback={(data) => (
                    <Error
                      resetError={() => {
                        data.resetError();
                      }}
                    />
                  )}
                >
                  <Stack initialRouteName="(app)" screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(app)" />
                    <Stack.Screen name="onboarding" />
                  </Stack>
                </ErrorBoundary>
              </OnboardingProvider>
            </ThemeProvider>
          </SafeAreaProvider>
          {devtools && <ReactQueryDevtools initialIsOpen={false} client={queryClient} />}
        </ToastProvider>
      </PersistQueryClientProvider>
    </WagmiProvider>
  );
});
