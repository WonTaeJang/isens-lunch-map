import 'server-only';
import { Pool, type PoolClient } from 'pg';
import { readFileSync } from 'node:fs';

const globalForDb = globalThis as unknown as { lunchDb?: Pool };

export function getDb() {
  if (globalForDb.lunchDb) return globalForDb.lunchDb;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync(`${process.cwd()}/lib/certs/supabase-ca.crt`, 'utf8'),
    },
    max: 2,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  });
  // Never log connection errors: they can contain connection details.
  pool.on('error', () => console.error('Database idle connection failed'));
  globalForDb.lunchDb = pool;
  return pool;
}

/** Runs `work` in one transaction on its own connection: committed if it resolves, rolled back if
 * it throws (the error is rethrown). */
export async function withTransaction<T>(
  db: Pick<Pool, 'connect'>,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
