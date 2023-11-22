import type { ExpoConfig } from "expo/config";

import metadata from "./package.json";

export default {
  name: "exactly",
  slug: "exactly",
  scheme: "exactly",
  version: metadata.version,

  icon: "./assets/icon.png",
  orientation: "portrait",
  assetBundlePatterns: ["**/*"],
  splash: { image: "./assets/splash.png", resizeMode: "contain" },

  android: { package: "app.exactly.mobile", adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png" } },
  ios: { bundleIdentifier: "app.exactly.mobile", supportsTablet: true },
  web: { bundler: "metro", output: "server" as "static", favicon: "./assets/favicon.png" },

  plugins: [
    "sentry-expo",
    ["expo-router", { origin: "https://exactly.app" }],
    ["expo-build-properties", { android: { compileSdkVersion: 34, targetSdkVersion: 34 } }],
  ],
  experiments: { typedRoutes: true },
  hooks: {
    postPublish: [{ file: "sentry-expo/upload-sourcemaps", config: { organization: "exactly", project: "mobile" } }],
  },

  extra: { eas: { projectId: "06bc0158-d23b-430b-a7e8-802df03c450b" } },
  owner: "exactly",
} as ExpoConfig;
