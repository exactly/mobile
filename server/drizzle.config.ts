import { defineConfig } from "drizzle-kit";

if (!process.env.POSTGRES_URL) throw new Error("missing postgres url");

export default defineConfig({
  dbCredentials: { url: process.env.POSTGRES_URL },
  dialect: "postgresql",
  schema: "database/schema.ts",
  strict: true,
  verbose: true,
});
