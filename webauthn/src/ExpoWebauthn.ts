import { isRunningInExpoGo } from "expo";
import { requireNativeModule } from "expo-modules-core";

export default isRunningInExpoGo()
  ? undefined // TODO mock
  : requireNativeModule<{
      create: (requestJSON: string) => Promise<string>;
      get(requestJSON: string): Promise<string>;
    }>("ExpoWebauthn");
