import type { ExpoConfig } from "expo/config";
import type { PluginConfigType as BuildPropertiesConfig } from "expo-build-properties/build/pluginConfig";
import type { OneSignalPluginProps } from "onesignal-expo-plugin/types/types";

import metadata from "./package.json";

const vercelURL =
  process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_BRANCH_URL;
if (vercelURL) process.env.EXPO_PUBLIC_URL ??= vercelURL;

export default {
  name: "exactly",
  slug: "exactly",
  scheme: "exactly",
  version: metadata.version,

  icon: "src/assets/icon.png",
  orientation: "portrait",
  assetBundlePatterns: ["**/*"],
  splash: { image: "src/assets/splash.png", resizeMode: "contain" },

  android: { package: "app.exactly", adaptiveIcon: { foregroundImage: "src/assets/adaptive-icon.png" } },
  ios: {
    bundleIdentifier: "app.exactly",
    associatedDomains: [`webcredentials:${vercelURL || "web.exactly.app"}?mode=developer`], // TODO remove developer mode
    supportsTablet: true,
  },
  web: { output: "static", favicon: "src/assets/favicon.png" },

  plugins: [
    [
      "expo-build-properties",
      {
        android: { packagingOptions: { pickFirst: ["**/libcrypto.so"] } },
        ios: { deploymentTarget: "15.0" },
      } as BuildPropertiesConfig,
    ],
    "expo-router",
    ["expo-font", { sources: ["src/assets/fonts"] }],
    ["@sentry/react-native/expo", { organization: "exactly", project: "mobile" }],
    [
      "onesignal-expo-plugin",
      {
        mode: "development",
        smallIcons: ["src/assets/notifications_default.png"],
        largeIcons: ["src/assets/notifications_default_large.png"],
      } as OneSignalPluginProps,
    ],
  ],
  experiments: { typedRoutes: true },

  extra: { eas: { projectId: "06bc0158-d23b-430b-a7e8-802df03c450b" } },
  owner: "exactly",
} as ExpoConfig;
