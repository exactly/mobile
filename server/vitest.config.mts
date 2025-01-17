import { padHex } from "viem";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "test/anvil.ts",
    env: {
      ALCHEMY_ACTIVITY_KEY: "activity",
      ALCHEMY_BLOCK_KEY: "block",
      ALCHEMY_WEBHOOKS_KEY: "webhooks",
      AUTH_SECRET: "auth",
      CRYPTOMATE_WEBHOOK_KEY: "cryptomate",
      EXPO_PUBLIC_ALCHEMY_API_KEY: " ",
      ISSUER_PRIVATE_KEY: padHex("0x420"),
      KEEPER_PRIVATE_KEY: padHex("0x69"),
      POSTGRES_URL: "postgres",
      REDIS_URL: "redis",
      SEGMENT_WRITE_KEY: "segment",
    },
    coverage: { enabled: true, reporter: ["lcov"] },
  },
});
