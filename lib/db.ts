import "server-only";
import { Pool } from "pg";
import { readFileSync } from "node:fs";

const globalForDb = globalThis as unknown as { lunchDb?: Pool };

export function getDb() {
  if (globalForDb.lunchDb) return globalForDb.lunchDb;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: true, ca: readFileSync(`${process.cwd()}/lib/certs/supabase-ca.crt`, "utf8") },
    max: 2,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  });
  // Never log connection errors: they can contain connection details.
  pool.on("error", () => console.error("Database idle connection failed"));
  globalForDb.lunchDb = pool;
  return pool;
}
