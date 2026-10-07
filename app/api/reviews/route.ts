import { decodeReviewCursor } from '@/lib/server/review-cursor';
import { getDb } from '@/lib/server/db';
import {
  getOwnReview,
  listReviews,
  listUserReviews,
  listOwnRecommendations,
  mutateReview,
} from '@/lib/server/reviews';
import { ReviewError, uuid } from '@/lib/reviews/model';
import { logUnexpectedError, readJsonObject } from '@/lib/server/api-route';

export const runtime = 'nodejs';
function failure(error: unknown) {
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
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const user = params.get('user_id') ? uuid(params.get('user_id')) : null;
    const cursor = decodeReviewCursor(params.get('cursor'));
    if (params.has('offset') && params.get('offset') !== '0')
      throw new ReviewError('페이지를 새로고침한 뒤 다시 조회해 주세요.');
    if (params.get('scope') === 'review') {
      if (!user) throw new ReviewError('사용자 정보가 필요해요.');
      return Response.json(
        { review: await getOwnReview(getDb(), uuid(params.get('review_id')), user) },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    if (params.get('scope') === 'reviewed-restaurants') {
      if (!user) throw new ReviewError('사용자 정보가 필요해요.');
      return Response.json(
        { restaurants: await listOwnRecommendations(getDb(), user) },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    if (params.get('scope') === 'mine') {
      if (!user) throw new ReviewError('사용자 정보가 필요해요.');
      return Response.json(await listUserReviews(getDb(), user, cursor), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }
    const restaurant = uuid(params.get('restaurant_id'));
    return Response.json(await listReviews(getDb(), restaurant, user, cursor), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return failure(error);
  }
}
async function write(request: Request) {
  try {
    const body = await readJsonObject(
      request,
      16000,
      (message, status) => new ReviewError(message, status),
    );
    await mutateReview(getDb(), request.method, body);
    return Response.json({ ok: true }, { status: request.method === 'POST' ? 201 : 200 });
  } catch (error) {
    return failure(error);
  }
}
export const POST = write;
export const PATCH = write;
export const DELETE = write;
