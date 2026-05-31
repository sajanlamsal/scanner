import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Returns a fresh Drizzle client per call — safe for serverless (Neon HTTP is
 * stateless) and avoids module-level initialization that would throw at build
 * time when NEON_DATABASE_URL is not set.
 */
export function getDb() {
  return drizzle(neon(process.env.NEON_DATABASE_URL!), { schema });
}

export { schema };
