import 'server-only';

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
 * Reads a same-origin JSON object body of at most `maxLength` characters.
 * Failures are thrown through `fail` so each route keeps its own error type and status codes.
 */
export async function readJsonObject(
  request: Request,
  maxLength: number,
  fail: (message: string, status?: number) => Error,
): Promise<Record<string, unknown>> {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    throw fail('허용되지 않은 요청입니다.', 403);
  const text = await request.text();
  if (text.length > maxLength) throw fail('입력 내용이 너무 큽니다.', 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw fail('요청 형식이 올바르지 않습니다.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw fail('요청 형식이 올바르지 않습니다.');
  return body as Record<string, unknown>;
}
