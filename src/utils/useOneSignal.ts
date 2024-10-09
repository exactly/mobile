import { useState, useEffect } from "react";
import { Platform } from "react-native";
import type * as OneSignalNative from "react-native-onesignal";
import type * as OneSignalWeb from "react-onesignal";

import handleError from "./handleError";

const appId = process.env.EXPO_PUBLIC_ONE_SIGNAL_APP_ID;

const { initialization, login, logout } = (
  Platform.OS === "web" && typeof window !== "undefined"
    ? () => {
        const { default: OneSignal } = require("react-onesignal") as typeof OneSignalWeb; // eslint-disable-line @typescript-eslint/no-require-imports, unicorn/prefer-module
        return {
          initialization: appId
            ? OneSignal.init({ appId, allowLocalhostAsSecureOrigin: __DEV__ }).catch(handleError)
            : Promise.resolve(),
          login: (userId: string) => OneSignal.login(userId),
          logout: () => OneSignal.logout(),
        };
      }
    : () => {
        const { OneSignal } = require("react-native-onesignal") as typeof OneSignalNative; // eslint-disable-line @typescript-eslint/no-require-imports, unicorn/prefer-module
        return {
          initialization: (() => {
            if (appId) OneSignal.initialize(appId);
            return Promise.resolve();
          })(),
          login: (userId: string) => {
            OneSignal.login(userId);
            return Promise.resolve();
          },
          logout: () => {
            OneSignal.logout();
            return Promise.resolve();
          },
        };
      }
)();

export default function useOneSignal({ userId }: { userId?: string } = {}) {
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    initialization
      .then(() => {
        setInitialized(true);
      })
      .catch(handleError);
    if (userId && initialized) login(userId).catch(handleError);
    return () => {
      if (userId) logout().catch(handleError);
    };
  }, [userId, initialized]);
  return initialized;
}
