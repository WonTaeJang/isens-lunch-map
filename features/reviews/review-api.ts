import type { ReviewLikeState, ReviewWriteResult } from '@/lib/reviews/model';
import { requestJson } from '@/lib/request-json';

export { ApiError } from '@/lib/request-json';

export function reviewRequest<T>(url: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(url, init, '리뷰 요청을 처리하지 못했어요.');
}

export type ReviewWriteMethod = 'POST' | 'PATCH' | 'DELETE';

function sendJson<T>(
  url: string,
  method: ReviewWriteMethod,
  body: object,
  request = reviewRequest,
) {
  return request<T>(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Creates, edits or deletes a review through /api/reviews. */
export function writeReview(
  method: ReviewWriteMethod,
  body: object,
  request: typeof reviewRequest = reviewRequest,
) {
  return sendJson<ReviewWriteResult>('/api/reviews', method, body, request);
}

/** Likes (or with `liked` false, unlikes) a review as `userId`. */
export function likeReview(reviewId: string, userId: string, liked: boolean) {
  return sendJson<ReviewLikeState>('/api/reviews/likes', liked ? 'POST' : 'DELETE', {
    review_id: reviewId,
    user_id: userId,
  });
}
