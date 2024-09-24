import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { vi } from "vitest";

import * as schema from "../database/schema";

vi.mock("../database", async () => {
  const { default: _, ...original } = await import("../database");
  const { pushSchema } = require("drizzle-kit/api") as typeof import("drizzle-kit/api"); // eslint-disable-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports, unicorn/prefer-module
  const database = drizzle(new PGlite(undefined, { debug: 0 }), { schema });
  const { apply } = await pushSchema(schema, database as unknown as PgliteDatabase);
  await apply();
  return { ...original, default: database };
});
