import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { OneSignal as RNOneSignal } from "react-native-onesignal";
import ROneSignal from "react-onesignal";

import { oneSignalAPPId } from "./constants";

type OneSignalProperties = {
  userId?: string;
};

type Instance =
  | {
      type: "native";
      value: typeof RNOneSignal;
    }
  | {
      type: "web";
      value: typeof ROneSignal;
    };

export default function useOneSignal({ userId }: OneSignalProperties) {
  const instance = useRef<Instance | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const load = async function () {
      if (!oneSignalAPPId) {
        setInitialized(true);
        return;
      }

      if (!initialized) {
        switch (Platform.OS) {
          case "web": {
            await ROneSignal.init({
              appId: oneSignalAPPId,
              allowLocalhostAsSecureOrigin: true,
            });
            instance.current = { type: "web", value: ROneSignal };
            break;
          }
          case "ios":
          case "android": {
            RNOneSignal.initialize(oneSignalAPPId);
            instance.current = { type: "native", value: RNOneSignal };
            break;
          }
        }

        setInitialized(true);
      }

      if (instance.current && userId) {
        await instance.current.value.login(userId);
      }
    };

    load().catch(() => {
      setInitialized(true);
    });

    return () => {
      if (!userId || !instance.current) {
        return;
      }

      const logout = instance.current.value.logout();
      if (logout instanceof Promise) {
        logout.catch(() => {
          // ignore
        });
      }
    };
  }, [userId, initialized]);

  return initialized;
}
