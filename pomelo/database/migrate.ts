import debug from "debug";
import { migrate } from "drizzle-orm/vercel-postgres/migrator";

import database from "./index.js";

const log = debug("pomelo");

try {
  log("🏗️ migration started");
  await migrate(database, {
    migrationsFolder: "drizzle",
  });
  log("✅ migration finished");
} catch (error) {
  log("❌ migration failed", error);
  throw error;
}
