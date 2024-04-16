import { optimismSepolia } from "@wagmi/core/chains";
import { Platform } from "react-native";

export const rpId = __DEV__ && Platform.OS === "web" ? "localhost" : "exactly.app";

if (!process.env.EXPO_PUBLIC_ALCHEMY_API_KEY) throw new Error("missing alchemy api key");
if (!process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID) throw new Error("missing alchemy gas policy");
if (!process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID) throw new Error("missing turnkey organization id");
if (!process.env.EXPO_PUBLIC_TURNKEY_API_PUBLIC_KEY) throw new Error("missing turnkey api public key");
if (!process.env.EXPO_PUBLIC_TURNKEY_API_PRIVATE_KEY) throw new Error("missing turnkey api private key");

export const alchemyAPIKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;
export const alchemyGasPolicyId = process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID;
export const turnkeyAPIPublicKey = process.env.EXPO_PUBLIC_TURNKEY_API_PUBLIC_KEY;
export const turnkeyAPIPrivateKey = process.env.EXPO_PUBLIC_TURNKEY_API_PRIVATE_KEY;
export const turnkeyOrganizationId = process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID;
export const oneSignalAppId = process.env.EXPO_PUBLIC_ONE_SIGNAL_APP_ID;

export const chain = {
  ...optimismSepolia,
  fees: undefined,
  network: "op-sepolia",
  rpcUrls: {
    ...optimismSepolia.rpcUrls,
    public: {
      http: ["https://sepolia.optimism.io/"],
    },
    alchemy: {
      http: ["https://opt-sepolia.g.alchemy.com/v2"],
      webSocket: ["wss://opt-sepolia.g.alchemy.com/v2"],
    },
  },
};
