import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import type { PoolClient } from 'pg';
import { getDb } from './db';
import { logUnexpectedError } from './api-route';
import { ImportError } from './import/parser';
import { SELECT_ALL_RESTAURANTS_SQL, type Restaurant } from './restaurants';

// 관리자가 식당 테이블을 바꾸는 공통 절차(엑셀 저장, 거리·좌표 재측정).
// 미리보기 때의 리비전과 서명을 저장할 때 다시 확인하고, 테이블을 잠근 한 트랜잭션 안에서만 씁니다.

/** Fingerprint of every restaurant row: a preview stays valid only while this is unchanged. */
export function revision(rows: Restaurant[]) {
  return createHash('sha256')
    .update(JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id))))
    .digest('hex');
}

/** HMAC keyed by ADMIN_PASSWORD, binding a save request to exactly what its preview showed. */
export function adminSignature(...parts: (string | Buffer)[]) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new ImportError('서버에 ADMIN_PASSWORD를 설정해 주세요.');
  const hmac = createHmac('sha256', secret);
  parts.forEach((part) => hmac.update(part));
  return hmac.digest('hex');
}

/**
 * Runs `write` in one transaction with the restaurants table locked, after checking the rows
 * still match the preview's `expected` revision (otherwise throws `staleMessage`).
 * Any failure rolls everything back.
 */
export async function writeLocked<T>(
  expected: string,
  staleMessage: string,
  write: (client: PoolClient, rows: Restaurant[]) => Promise<T>,
): Promise<T> {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE public.restaurants IN EXCLUSIVE MODE');
    const { rows } = await client.query<Restaurant>(SELECT_ALL_RESTAURANTS_SQL);
    if (revision(rows) !== expected) throw new ImportError(staleMessage);
    const result = await write(client, rows);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * A failed admin request: our own (ImportError) message with its status, or for anything else
 * (a DB failure, a bug) a logged 500 with `fallback`, so driver details never reach the browser.
 */
export function adminErrorResponse(error: unknown, fallback: string, init?: ResponseInit) {
  if (error instanceof ImportError)
    return Response.json({ error: error.message }, { ...init, status: error.status });
  logUnexpectedError('Admin request failed', error);
  return Response.json({ error: fallback }, { ...init, status: 500 });
}
