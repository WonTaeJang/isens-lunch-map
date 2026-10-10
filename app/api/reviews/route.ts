import { decodeReviewCursor } from '@/lib/server/review-cursor';
import { getDb } from '@/lib/server/db';
import {
  getOwnReview,
  getReviewVote,
  listReviews,
  listUserReviews,
  listOwnRecommendations,
  mutateReview,
} from '@/lib/server/reviews';
import { ReviewError, uuid } from '@/lib/reviews/model';
import { readReviewBody, reviewFailure as failure } from '@/lib/server/review-response';

export const runtime = 'nodejs';
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
    if (params.get('scope') === 'vote') {
      if (!user) throw new ReviewError('사용자 정보가 필요해요.');
      return Response.json(await getReviewVote(getDb(), restaurant, user), {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }
    return Response.json(await listReviews(getDb(), restaurant, user, cursor), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return failure(error);
  }
}
async function write(request: Request) {
  try {
    const body = await readReviewBody(request, 16000);
    const result = await mutateReview(getDb(), request.method, body);
    return Response.json(
      { ok: true, ...result },
      { status: request.method === 'POST' ? 201 : 200 },
    );
  } catch (error) {
    return failure(error);
  }
}
export const POST = write;
export const PATCH = write;
export const DELETE = write;
