import "dotenv/config";
import type { ExpoConfig } from "expo/config";
import type { PluginConfigType as BuildPropertiesConfig } from "expo-build-properties/build/pluginConfig";
import type { FontProps } from "expo-font/plugin/build/withFonts";
import { execSync } from "node:child_process";
import type { OneSignalPluginProps } from "onesignal-expo-plugin/types/types";

import metadata from "./package.json";

if (process.env.APP_DOMAIN) process.env.EXPO_PUBLIC_DOMAIN ??= process.env.APP_DOMAIN;

export default {
  name: "Exa",
  slug: "exactly",
  scheme: "exactly",
  version: metadata.version,
  orientation: "portrait",
  android: {
    package: "app.exactly",
    adaptiveIcon: { foregroundImage: "src/assets/icon.png", backgroundColor: "#1D1D1D" },
    permissions: ["android.permission.CAMERA"],
    userInterfaceStyle: "automatic",
    splash: {
      backgroundColor: "#FCFCFC",
      image: "src/assets/splash.png",
      mdpi: "src/assets/splash.png",
      hdpi: "src/assets/splash@1.5x.png",
      xhdpi: "src/assets/splash@2x.png",
      xxhdpi: "src/assets/splash@3x.png",
      xxxhdpi: "src/assets/splash@4x.png",
      dark: {
        backgroundColor: "#1D1D1D",
        image: "src/assets/splash-dark.png",
        mdpi: "src/assets/splash-dark.png",
        hdpi: "src/assets/splash-dark@1.5x.png",
        xhdpi: "src/assets/splash-dark@2x.png",
        xxhdpi: "src/assets/splash-dark@3x.png",
        xxxhdpi: "src/assets/splash-dark@4x.png",
      },
    },
  },
  ios: {
    icon: "src/assets/icon-ios.png",
    bundleIdentifier: "app.exactly",
    associatedDomains: [`webcredentials:${process.env.EXPO_PUBLIC_DOMAIN ?? "web.exactly.app"}`],
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: "This app uses the camera to verify your identity.",
      NSLocationWhenInUseUsageDescription: "This app uses your location to verify your identity.",
    },
    userInterfaceStyle: "automatic",
    splash: {
      backgroundColor: "#FCFCFC",
      image: "src/assets/splash.png",
      dark: { backgroundColor: "#1D1D1D", image: "src/assets/splash-dark.png" },
    },
  },
  web: { output: "static", favicon: "src/assets/favicon.png" },
  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          packagingOptions: { pickFirst: ["**/libcrypto.so"] },
          extraMavenRepos: ["https://sdk.withpersona.com/android/releases"],
          newArchEnabled: true,
        },
        ios: { deploymentTarget: "15.0", newArchEnabled: true },
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
    [
      "@intercom/intercom-react-native",
      {
        appId: "eknd6y0s",
        androidApiKey: process.env.INTERCOM_ANDROID_API_KEY,
        iosApiKey: process.env.INTERCOM_IOS_API_KEY,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: "06bc0158-d23b-430b-a7e8-802df03c450b" },
    release: execSync("git describe").toString().trim(),
  },
  updates: { url: "https://u.expo.dev/06bc0158-d23b-430b-a7e8-802df03c450b" },
  runtimeVersion: { policy: "fingerprint" },
  owner: "exactly",
} as ExpoConfig;
