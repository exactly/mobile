import rpId from "@exactly/common/rpId";

export const apiURL = rpId === "localhost" ? "http://localhost:3000/api" : `https://${rpId}/api`;
export const oneSignalAppId = process.env.EXPO_PUBLIC_ONE_SIGNAL_APP_ID;
