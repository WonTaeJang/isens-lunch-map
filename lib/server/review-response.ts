import 'server-only';
import { ReviewError } from '@/lib/reviews/model';
import { logUnexpectedError, readJsonObject } from './api-route';

/** Error response shared by the review API routes: expected errors keep their message/status. */
export function reviewFailure(error: unknown) {
  if (!(error instanceof ReviewError)) logUnexpectedError('Review request failed', error);
  return Response.json(
    {
      error:
        error instanceof ReviewError
          ? error.message
          : '리뷰 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    },
    { status: error instanceof ReviewError ? error.status : 500 },
  );
}

/** Same-origin JSON body of a review API request. */
export function readReviewBody(request: Request, maxLength: number) {
  return readJsonObject(request, maxLength, (message, status) => new ReviewError(message, status));
}
