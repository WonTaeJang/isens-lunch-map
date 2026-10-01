export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function reviewRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      typeof body?.error === 'string' ? body.error : '리뷰 요청을 처리하지 못했습니다.',
      response.status,
    );
  if (body === null) throw new ApiError('서버 응답을 읽지 못했습니다.', response.status);
  return body as T;
}
