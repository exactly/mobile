import { goerli } from "@wagmi/core/chains";
import { Platform } from "react-native";

export const rpId = __DEV__ && Platform.OS === "web" ? "localhost" : "exactly.app";

if (!process.env.EXPO_PUBLIC_ALCHEMY_API_KEY) throw new Error("missing alchemy api key");
if (!process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID) throw new Error("missing alchemy gas policy");
if (!process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID) throw new Error("missing turnkey organization id");
if (!process.env.EXPO_PUBLIC_TURNKEY_API_PUBLIC_KEY) throw new Error("missing turnkey api public key");
if (!process.env.EXPO_PUBLIC_TURNKEY_API_PRIVATE_KEY) throw new Error("missing turnkey api private key");
if (!process.env.POMELO_BASE_URL) throw new Error("missing pomelo base url");
if (!process.env.POMELO_CLIENT_ID) throw new Error("missing pomelo client id");
if (!process.env.POMELO_CLIENT_SECRET) throw new Error("missing pomelo client secret");
if (!process.env.POMELO_AUDIENCE) throw new Error("missing pomeloaudience");
if (!process.env.POMELO_API_KEY) throw new Error("missing pomelo api key");
if (!process.env.POMELO_API_SECRET) throw new Error("missing pomelo api secret");

export const alchemyAPIKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;
export const alchemyGasPolicyId = process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID;
export const turnkeyAPIPublicKey = process.env.EXPO_PUBLIC_TURNKEY_API_PUBLIC_KEY;
export const turnkeyAPIPrivateKey = process.env.EXPO_PUBLIC_TURNKEY_API_PRIVATE_KEY;
export const turnkeyOrganizationId = process.env.EXPO_PUBLIC_TURNKEY_ORGANIZATION_ID;
export const pomeloBaseUrl = process.env.POMELO_BASE_URL;
export const pomeloClientId = process.env.POMELO_CLIENT_ID;
export const pomeloClientSecret = process.env.POMELO_CLIENT_SECRET;
export const pomeloAudience = process.env.POMELO_AUDIENCE;
export const pomeloApiKey = process.env.POMELO_API_KEY;
export const pomeloApiSecret = process.env.POMELO_API_SECRET;

export const chain = {
  ...goerli,
  fees: undefined,
  network: "goerli",
  rpcUrls: {
    ...goerli.rpcUrls,
    public: {
      http: ["https://rpc.ankr.com/eth_goerli"],
    },
    alchemy: {
      http: ["https://eth-goerli.g.alchemy.com/v2"],
      webSocket: ["wss://eth-goerli.g.alchemy.com/v2"],
    },
  },
};
