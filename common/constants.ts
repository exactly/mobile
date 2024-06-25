export const rpId =
  process.env.EXPO_PUBLIC_URL ??
  (process.env.VERCEL_ENV === "production"
    ? process.env.VERCEL_PROJECT_PRODUCTION_URL
    : process.env.VERCEL_BRANCH_URL) ??
  "localhost";

export { optimismSepolia as chain } from "@alchemy/aa-core";
