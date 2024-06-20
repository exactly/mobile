if (!process.env.EXPO_PUBLIC_ALCHEMY_API_KEY) throw new Error("missing alchemy api key");
if (!process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID) throw new Error("missing alchemy gas policy");
if (!process.env.EXPO_PUBLIC_SERVER_URL) throw new Error("missing server url");

export const alchemyAPIKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;
export const alchemyGasPolicyId = process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID;
export const oneSignalAppId = process.env.EXPO_PUBLIC_ONE_SIGNAL_APP_ID;
export const serverURL = process.env.EXPO_PUBLIC_SERVER_URL;
