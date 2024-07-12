import { parse } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { readFileSync } from "node:fs";
import path from "node:path";

export default defineConfig({
  schema: "database/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: parse(readFileSync(path.resolve(__dirname, "../.vercel/.env.development.local"))).POSTGRES_URL ?? "",
  },
  verbose: true,
  strict: true,
});
