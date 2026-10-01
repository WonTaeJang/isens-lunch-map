export async function reviewRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || '리뷰 요청을 처리하지 못했습니다.');
  return body;
}
