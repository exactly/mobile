import "dotenv/config";

import type { IntercomPluginProps } from "@intercom/intercom-react-native/lib/typescript/expo-plugins/@types";
import type { withSentry } from "@sentry/react-native/expo";
import type { ExpoConfig } from "expo/config";
import type { PluginConfigType as BuildPropertiesConfig } from "expo-build-properties/build/pluginConfig";
import type withCamera from "expo-camera/plugin/build/withCamera";
import type { FontProps } from "expo-font/plugin/build/withFonts";
import type { OneSignalPluginProps } from "onesignal-expo-plugin/types/types";

import release from "./common/generated/release.js";
import metadata from "./package.json";
import versionCode from "./src/generated/versionCode.js";

const { Mode } =
  require("onesignal-expo-plugin/build/types/types") as typeof import("onesignal-expo-plugin/types/types"); // eslint-disable-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports, unicorn/prefer-module

if (process.env.APP_DOMAIN) process.env.EXPO_PUBLIC_DOMAIN ??= process.env.APP_DOMAIN;

const buildProperties: BuildPropertiesConfig = {
  android: {
    packagingOptions: { pickFirst: ["**/libcrypto.so"] },
    extraMavenRepos: ["https://sdk.withpersona.com/android/releases"],
    newArchEnabled: true,
  },
  ios: { deploymentTarget: "15.0", newArchEnabled: true },
};

const camera: Parameters<typeof withCamera>[1] = {
  cameraPermission: "Exactly needs your permission to scan QR codes.",
};

const font: FontProps = {
  fonts: [
    "src/assets/fonts/BDOGrotesk-Bold.otf",
    "src/assets/fonts/BDOGrotesk-Regular.otf",
    "src/assets/fonts/IBMPlexMono-Bold.otf",
    "src/assets/fonts/IBMPlexMono-Regular.otf",
    "src/assets/fonts/IBMPlexMono-SemiBold.otf",
  ],
};

const intercom: IntercomPluginProps = {
  appId: "eknd6y0s",
  androidApiKey: "android_sdk-d602d62cbdb9e8e0a6f426db847ddc74d2e26090",
  iosApiKey: "ios_sdk-ad6831098d9c2d69bd98e92a5ad7a4f030472a92",
};

const sentry: Parameters<typeof withSentry>[1] = { organization: "exactly", project: "mobile" };

const onesignal: OneSignalPluginProps = {
  mode: process.env.NODE_ENV === "production" ? Mode.Prod : Mode.Dev,
  smallIcons: ["src/assets/notifications_default.png"],
  largeIcons: ["src/assets/notifications_default_large.png"],
};

const config: ExpoConfig = {
  name: "Exa",
  slug: "exactly",
  scheme: "exactly",
  version: `v${metadata.version}`,
  orientation: "portrait",
  android: {
    package: "app.exactly",
    adaptiveIcon: { foregroundImage: "src/assets/icon.png", backgroundColor: "#1D1D1D" },
    permissions: ["android.permission.CAMERA"],
    userInterfaceStyle: "automatic",
    versionCode,
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
    buildNumber: String(versionCode),
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
    ["expo-build-properties", buildProperties],
    ["expo-camera", camera],
    ["expo-font", font],
    "expo-router",
    ["@intercom/intercom-react-native", intercom],
    ["@sentry/react-native/expo", sentry],
    ["onesignal-expo-plugin", onesignal],
  ],
  experiments: { typedRoutes: true },
  extra: { release, eas: { projectId: "06bc0158-d23b-430b-a7e8-802df03c450b" } },
  updates: { url: "https://u.expo.dev/06bc0158-d23b-430b-a7e8-802df03c450b" },
  runtimeVersion: { policy: "fingerprint" },
  owner: "exactly",
};

export default config;
