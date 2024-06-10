import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "database/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.POSTGRES_URL ?? "" },
  verbose: true,
  strict: true,
});
