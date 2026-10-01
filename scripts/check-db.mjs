import nextEnv from '@next/env';
import pg from 'pg';
import { readFileSync } from 'node:fs';
nextEnv.loadEnvConfig(process.cwd());
let pool;
try {
  const url = process.env.DATABASE_URL;
  if (!url) throw { code: 'MISSING_DATABASE_URL' };
  const parsed = new URL(url);
  console.log('Connection configuration:', {
    protocol: parsed.protocol,
    port: parsed.port || '5432',
    transactionPooler: parsed.hostname.endsWith('.pooler.supabase.com') && parsed.port === '6543',
  });
  pool = new pg.Pool({
    connectionString: url,
    ssl: {
      rejectUnauthorized: true,
      ca: readFileSync(new URL('../lib/certs/supabase-ca.crt', import.meta.url), 'utf8'),
    },
    max: 1,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  });
  await pool.query('select 1');
  console.log('Database connection: OK');
  const { rows } = await pool.query(
    "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'restaurants' order by ordinal_position",
  );
  console.log('Restaurant table columns:', rows);
  if (rows.length) {
    const result = await pool.query('select count(*)::int as count from public.restaurants');
    console.log('Restaurant count:', result.rows[0].count);
  }
} catch (error) {
  const code =
    typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
      ? error.code
      : 'CONNECTION_FAILED';
  console.error('Database check failed:', code);
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
