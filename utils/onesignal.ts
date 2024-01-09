import { Platform } from "react-native";

type OneSignalProperties = {
  userId?: string;
};

type OneSignal = (parameters: OneSignalProperties) => void;

export default Platform.select<OneSignal>({
  // eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
  web: require("./onesignal.web") as OneSignal,
  // eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
  android: require("./onesignal.native") as OneSignal,
  // eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
  ios: require("./onesignal.native") as OneSignal,
  // eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
  default: require("./onesignal.native") as OneSignal,
});
