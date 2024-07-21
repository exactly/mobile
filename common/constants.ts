/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion -- prevents typescript-eslint issues */

export const rpId = (process.env.EXPO_PUBLIC_URL ??
  (process.env.VERCEL_ENV === "production"
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_BRANCH_URL) ??
  "localhost") as string;

export { default as chain } from "./chain.js";

if (!process.env.EXPO_PUBLIC_ALCHEMY_API_KEY) throw new Error("missing alchemy api key");
if (!process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID) throw new Error("missing alchemy gas policy");

export const alchemyAPIKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY as string;
export const alchemyGasPolicyId = process.env.EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID as string;

/* eslint-enable @typescript-eslint/no-unnecessary-type-assertion */
