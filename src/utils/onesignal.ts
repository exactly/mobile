import appId from "@exactly/common/onesignalAppId";
import { Platform } from "react-native";
import type * as OneSignalNative from "react-native-onesignal";
import type * as OneSignalWeb from "react-onesignal";

import handleError from "./handleError";

const { initialization, enablePrompt, login, logout } = (
  Platform.OS === "web" && typeof window !== "undefined"
    ? () => {
        const { default: OneSignal } = require("react-onesignal") as typeof OneSignalWeb; // eslint-disable-line @typescript-eslint/no-require-imports, unicorn/prefer-module
        let displayPrompt: (() => void) | undefined;
        return {
          initialization: appId
            ? OneSignal.init({
                appId,
                allowLocalhostAsSecureOrigin: __DEV__,
                notifyButton: {
                  enabled: true,
                  showCredit: false,
                  displayPredicate: () =>
                    new Promise((resolve) => {
                      displayPrompt = () => {
                        displayPrompt = undefined;
                        resolve(!OneSignal.Notifications.permission && OneSignal.Notifications.isPushSupported());
                      };
                    }),
                },
              }).catch(handleError)
            : Promise.resolve(),
          enablePrompt: () => {
            if (appId) initialization.then(() => displayPrompt?.()).catch(handleError);
          },
          login: (userId: string) => {
            if (appId) return OneSignal.login(userId);
            return Promise.resolve();
          },
          logout: () => {
            if (appId) return OneSignal.logout();
            return Promise.resolve();
          },
        };
      }
    : () => {
        const { OneSignal } = require("react-native-onesignal") as typeof OneSignalNative; // eslint-disable-line @typescript-eslint/no-require-imports, unicorn/prefer-module
        return {
          initialization: (() => {
            if (appId) OneSignal.initialize(appId);
            return Promise.resolve();
          })(),
          enablePrompt: () => {
            if (appId) OneSignal.InAppMessages.addTrigger("onboard", "1");
          },
          login: (userId: string) => {
            if (appId) OneSignal.login(userId);
            return Promise.resolve();
          },
          logout: () => {
            if (appId) OneSignal.logout();
            return Promise.resolve();
          },
        };
      }
)();

export { initialization, enablePrompt, login, logout };
