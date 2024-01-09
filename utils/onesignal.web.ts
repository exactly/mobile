import { useState, useEffect, useRef } from "react";
import OneSignal from "react-onesignal";

import { oneSignalAPPId } from "./constants";

type OneSignalProperties = {
  userId?: string;
};

type Instance = typeof OneSignal;

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
        await OneSignal.init({
          appId: oneSignalAPPId,
          allowLocalhostAsSecureOrigin: true,
        });
        instance.current = OneSignal;

        setInitialized(true);
      }

      if (instance.current && userId) {
        await instance.current.login(userId);
      }
    };

    load().catch(() => {});

    return () => {
      if (!userId || !instance.current) {
        return;
      }

      instance.current.logout().catch(() => {});
    };
  }, [userId, initialized]);
}
