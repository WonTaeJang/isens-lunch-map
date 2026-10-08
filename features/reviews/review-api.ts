import type { ReviewWriteResult } from '@/lib/reviews/model';
import { requestJson } from '@/lib/request-json';

export { ApiError } from '@/lib/request-json';

export function reviewRequest<T>(url: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(url, init, '리뷰 요청을 처리하지 못했어요.');
}

export type ReviewWriteMethod = 'POST' | 'PATCH' | 'DELETE';
/** Creates, edits or deletes a review through /api/reviews. */
export function writeReview(
  method: ReviewWriteMethod,
  body: object,
  request: typeof reviewRequest = reviewRequest,
) {
  return request<ReviewWriteResult>('/api/reviews', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
