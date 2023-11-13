import { requireNativeModule } from "expo-modules-core";

export default requireNativeModule<{
  create: (requestJSON: string) => Promise<string>;
  get(requestJSON: string): Promise<string>;
}>("ExpoWebauthn");
