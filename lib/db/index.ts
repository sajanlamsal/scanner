import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Singleton Drizzle client — reuses the postgres.js connection pool across
 * requests instead of opening a new connection each time.
 */
export function getDb() {
  if (_db) return _db;
  _db = drizzle(postgres(process.env.DATABASE_URL!), { schema });
  return _db;
}

export { schema };
