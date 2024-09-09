import { padHex, zeroAddress } from "viem";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "test/anvil.ts",
    env: {
      COLLECTOR_ADDRESS: zeroAddress,
      CRYPTOMATE_WEBHOOK_KEY: "cryptomate",
      EXPO_PUBLIC_ALCHEMY_API_KEY: " ",
      ISSUER_PRIVATE_KEY: padHex("0x420"),
      KEEPER_PRIVATE_KEY: padHex("0x69"),
      POSTGRES_URL: "postgres",
      REDIS_URL: "redis",
    },
  },
});
