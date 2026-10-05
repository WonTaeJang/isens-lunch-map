import { requestJson } from '@/lib/request-json';

export { ApiError } from '@/lib/request-json';

export function reviewRequest<T>(url: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(url, init, '리뷰 요청을 처리하지 못했어요.');
}
