import 'server-only';
import { RequestError } from '@/lib/request-error';

/** For responses that depend on the viewer: never cached by the browser or shared caches. */
export const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' } as const;

/** Logs only PostgreSQL error metadata: messages can contain connection details or user input. */
export function logUnexpectedError(label: string, error: unknown) {
  const pg = (error ?? {}) as Record<string, unknown>;
  const pick = (key: string) => (typeof pg[key] === 'string' ? pg[key] : undefined);
  console.error(label, {
    name: error instanceof Error ? error.name : typeof error,
    code: pick('code'),
    table: pick('table'),
    column: pick('column'),
    constraint: pick('constraint'),
  });
}

/**
 * The error response of an API route: a RequestError keeps its message and status; anything else
 * (a DB failure, a bug) is logged under `label` and answered 500 with `fallback`, so driver
 * details never reach the browser.
 */
export function errorResponse(
  error: unknown,
  label: string,
  fallback: string,
  init?: ResponseInit,
) {
  if (error instanceof RequestError)
    return Response.json({ error: error.message }, { ...init, status: error.status });
  logUnexpectedError(label, error);
  return Response.json({ error: fallback }, { ...init, status: 500 });
}

/** False for a browser request sent from another site (requests without Origin pass). */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

/** Reads a same-origin JSON object body of at most `maxLength` characters. */
export async function readJsonObject(
  request: Request,
  maxLength: number,
): Promise<Record<string, unknown>> {
  if (!isSameOrigin(request)) throw new RequestError('허용되지 않은 요청이에요.', 403);
  const text = await request.text();
  if (text.length > maxLength) throw new RequestError('입력 내용이 너무 길어요.', 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new RequestError('요청 형식이 올바르지 않아요.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new RequestError('요청 형식이 올바르지 않아요.');
  return body as Record<string, unknown>;
}
