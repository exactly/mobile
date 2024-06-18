import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";

import * as schema from "./schema.ts";

export default drizzle(sql, { schema });

export * from "./schema.ts";
