import { useState, useEffect } from "react";
import { Platform } from "react-native";
import type OneSignalNative from "react-native-onesignal";
import type OneSignalWeb from "react-onesignal";

import handleError from "./handleError";
import { oneSignalAppId as appId } from "../constants";

const { initialization, login, logout } = (
  Platform.OS === "web"
    ? () => {
        const OneSignal = (require("react-onesignal") as { default: typeof OneSignalWeb }).default; // eslint-disable-line @typescript-eslint/no-var-requires, unicorn/prefer-module
        return {
          initialization:
            appId === undefined ? Promise.resolve() : OneSignal.init({ appId, allowLocalhostAsSecureOrigin: __DEV__ }),
          login: (userId: string) => OneSignal.login(userId),
          logout: () => OneSignal.logout(),
        };
      }
    : () => {
        const { OneSignal } = require("react-native-onesignal") as typeof OneSignalNative; // eslint-disable-line @typescript-eslint/no-var-requires, unicorn/prefer-module
        return {
          initialization: (() => {
            if (appId !== undefined) OneSignal.initialize(appId);
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
