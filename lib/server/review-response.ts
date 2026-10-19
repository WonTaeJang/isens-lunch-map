import 'server-only';
import { errorResponse } from './api-route';

/** Error response shared by the review API routes. */
export function reviewFailure(error: unknown) {
  return errorResponse(
    error,
    'Review request failed',
    '리뷰 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  );
}
