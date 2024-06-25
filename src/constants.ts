import { rpId } from "@exactly/common/constants";

if (!process.env.EXPO_PUBLIC_ALCHEMY_API_KEY) throw new Error("missing alchemy api key");
if (!process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID) throw new Error("missing alchemy gas policy");

export const apiURL = rpId === "localhost" ? "http://localhost:3000/api" : `https://${rpId}/api`;
export const alchemyAPIKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;
export const alchemyGasPolicyId = process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID;
export const oneSignalAppId = process.env.EXPO_PUBLIC_ONE_SIGNAL_APP_ID;
