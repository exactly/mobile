import type { KnipConfig } from "knip";

export default {
  entry: [
    "src/app/**/*.tsx!",
    "public/OneSignalSDKWorker.js!",
    "app.config.ts",
    "fingerprint.config.cjs",
    "metro.config.cjs",
    "svgo.config.mjs",
    "wagmi.config.ts",
  ],
  ignoreBinaries: ["forge", "slither"],
  ignoreDependencies: [
    "@alchemy/aa-core",
    "account-abstraction",
    "forge-std",
    "fresh-crypto-lib",
    "modular-account-libs",
    "modular-account",
    "openzeppelin-contracts",
    "solady",
    "solmate",
    "webauthn-owner-plugin",
    "webauthn-sol",
  ],
} satisfies KnipConfig;

process.env.POSTGRES_URL ??= "postgres";
