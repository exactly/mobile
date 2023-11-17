import ExpoConstants, { ExecutionEnvironment } from "expo-constants";
import { requireNativeModule } from "expo-modules-core";

const isExpoGo = ExpoConstants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default !isExpoGo
  ? requireNativeModule<{
      create: (requestJSON: string) => Promise<string>;
      get(requestJSON: string): Promise<string>;
    }>("ExpoWebauthn")
  : null;
