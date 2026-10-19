import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { PoolClient } from 'pg';
import { RequestError } from '@/lib/request-error';
import { getDb } from './db';
import { errorResponse, isSameOrigin } from './api-route';
import { SELECT_ALL_RESTAURANTS_SQL, type Restaurant } from './restaurants';

// 관리자 API 공통: 비밀번호 확인, 오류, 식당 테이블을 바꾸는 절차(엑셀 저장, 거리·좌표 재측정).
// 미리보기 때의 리비전과 서명을 저장할 때 다시 확인하고, 테이블을 잠근 한 트랜잭션 안에서만 씁니다.

/** An admin request error (Excel import, re-measuring, statistics): shown to the administrator. */
export class AdminError extends RequestError {}

/** Checks the admin password header (in constant time) and that the request is same-origin. */
export function authorize(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new AdminError('서버에 ADMIN_PASSWORD를 설정해 주세요.', 500);
  const given = request.headers.get('x-admin-password') ?? '';
  const hash = (s: string) => createHash('sha256').update(s).digest();
  if (!timingSafeEqual(hash(expected), hash(given)))
    throw new AdminError('관리자 비밀번호가 올바르지 않습니다.', 401);
  if (!isSameOrigin(request)) throw new AdminError('허용되지 않은 요청입니다.', 403);
}

/** Fingerprint of every restaurant row: a preview stays valid only while this is unchanged. */
export function revision(rows: Restaurant[]) {
  return createHash('sha256')
    .update(JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id))))
    .digest('hex');
}

/** HMAC keyed by ADMIN_PASSWORD, binding a save request to exactly what its preview showed. */
export function adminSignature(...parts: (string | Buffer)[]) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new AdminError('서버에 ADMIN_PASSWORD를 설정해 주세요.', 500);
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
    if (revision(rows) !== expected) throw new AdminError(staleMessage);
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

/** A failed admin request: see `errorResponse` (AdminError keeps its message and status). */
export function adminErrorResponse(error: unknown, fallback: string, init?: ResponseInit) {
  return errorResponse(error, 'Admin request failed', fallback, init);
}
