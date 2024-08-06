import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

if (!process.env.POSTGRES_URL) throw new Error("missing postgres url");

export default drizzle(new Pool({ connectionString: process.env.POSTGRES_URL }), { schema });

export * from "./schema";
