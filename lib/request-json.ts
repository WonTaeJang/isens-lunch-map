/** Error from an API route: the server's message (or a fallback) plus the HTTP status. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Fetches JSON without caching; non-2xx responses throw ApiError with the server's `error`. */
export async function requestJson<T>(
  url: string,
  init: RequestInit | undefined,
  fallbackMessage: string,
): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      typeof body?.error === 'string' ? body.error : fallbackMessage,
      response.status,
    );
  if (body === null) throw new ApiError('서버 응답을 읽지 못했습니다.', response.status);
  return body as T;
}
