import type { ExpoConfig } from "expo/config";
import type { PluginConfigType as BuildPropertiesConfig } from "expo-build-properties/build/pluginConfig";
import type { OneSignalPluginProps } from "onesignal-expo-plugin/types/types";

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
  web: { bundler: "metro", favicon: "./assets/favicon.png" },

  plugins: [
    [
      "expo-build-properties",
      {
        android: { compileSdkVersion: 34, targetSdkVersion: 34 },
        ios: { deploymentTarget: "13.4" },
      } as BuildPropertiesConfig,
    ],
    "expo-router",
    "sentry-expo",
    [
      "onesignal-expo-plugin",
      {
        mode: "development",
        smallIcons: ["./assets/notifications-default.png"],
        largeIcons: ["./assets/notifications-default-large.png"],
      } as OneSignalPluginProps,
    ],
  ],
  experiments: { typedRoutes: true },
  hooks: {
    postPublish: [{ file: "sentry-expo/upload-sourcemaps", config: { organization: "exactly", project: "mobile" } }],
  },

  extra: { eas: { projectId: "06bc0158-d23b-430b-a7e8-802df03c450b" } },
  owner: "exactly",
} as ExpoConfig;
