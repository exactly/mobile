import { useState, useEffect, useRef } from "react";
import { OneSignal as RNOneSignal } from "react-native-onesignal";

import { oneSignalAPPId } from "./constants";

type OneSignalProperties = {
  userId?: string;
};

type Instance = typeof RNOneSignal;

export default function useOneSignal({ userId }: OneSignalProperties) {
  const instance = useRef<Instance | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const load = function () {
      if (!oneSignalAPPId) {
        setInitialized(true);
        return;
      }

      if (!initialized) {
        RNOneSignal.initialize(oneSignalAPPId);
        instance.current = RNOneSignal;

        setInitialized(true);
      }

      if (instance.current && userId) {
        instance.current.login(userId);
      }
    };

    load();

    return () => {
      if (!userId || !instance.current) {
        return;
      }

      instance.current.logout();

      setInitialized(false);
    };
  }, [userId, initialized]);
}
