import "dotenv/config";
import type { ExpoConfig } from "expo/config";
import type { PluginConfigType as BuildPropertiesConfig } from "expo-build-properties/build/pluginConfig";
import type { FontProps } from "expo-font/plugin/build/withFonts";
import type { OneSignalPluginProps } from "onesignal-expo-plugin/types/types";

import metadata from "./package.json";

if (process.env.APP_DOMAIN) process.env.EXPO_PUBLIC_DOMAIN ??= process.env.APP_DOMAIN;

export default {
  name: "Exa",
  slug: "exactly",
  scheme: "exactly",
  version: metadata.version,
  icon: "src/assets/icon.png",
  orientation: "portrait",
  assetBundlePatterns: ["**/*"],
  splash: { image: "src/assets/splash.png", resizeMode: "contain" },
  userInterfaceStyle: "automatic",
  android: {
    package: "app.exactly",
    adaptiveIcon: { foregroundImage: "src/assets/adaptive-icon.png" },
    permissions: ["android.permission.CAMERA"],
    userInterfaceStyle: "automatic",
  },
  ios: {
    bundleIdentifier: "app.exactly",
    associatedDomains: [`webcredentials:${process.env.EXPO_PUBLIC_DOMAIN ?? "web.exactly.app"}`],
    supportsTablet: true,
    infoPlist: { NSCameraUsageDescription: "This app uses the camera to verify your identity." },
    userInterfaceStyle: "automatic",
  },
  web: { output: "static", favicon: "src/assets/favicon.png" },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          packagingOptions: { pickFirst: ["**/libcrypto.so"] },
          extraMavenRepos: ["https://sdk.withpersona.com/android/releases"],
        },
        ios: { deploymentTarget: "15.0" },
      } as BuildPropertiesConfig,
    ],
    "expo-router",
    [
      "expo-font",
      {
        fonts: [
          "src/assets/fonts/BDOGrotesk-Bold.otf",
          "src/assets/fonts/BDOGrotesk-Regular.otf",
          "src/assets/fonts/IBMPlexMono-Bold.otf",
          "src/assets/fonts/IBMPlexMono-Regular.otf",
          "src/assets/fonts/IBMPlexMono-SemiBold.otf",
        ],
      } as FontProps,
    ],
    ["@sentry/react-native/expo", { organization: "exactly", project: "mobile" }],
    [
      "onesignal-expo-plugin",
      {
        mode: "development",
        smallIcons: ["src/assets/notifications_default.png"],
        largeIcons: ["src/assets/notifications_default_large.png"],
      } as OneSignalPluginProps,
    ],
    ["expo-camera", { cameraPermission: "Exactly needs your permission to scan QR codes." }],
  ],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: "06bc0158-d23b-430b-a7e8-802df03c450b" } },
  updates: { url: "https://u.expo.dev/06bc0158-d23b-430b-a7e8-802df03c450b" },
  runtimeVersion: { policy: "fingerprint" },
  owner: "exactly",
} as ExpoConfig;
