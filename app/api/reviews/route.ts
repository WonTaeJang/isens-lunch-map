import { getDb } from '@/lib/server/db';
import { listReviews, listUserReviews, listReviewedRestaurantIds, mutateReview } from '@/lib/server/reviews';
import { ReviewError, uuid } from '@/features/reviews/review-model';

export const runtime = 'nodejs';
function failure(error: unknown) {
  return Response.json({ error: error instanceof ReviewError ? error.message : '리뷰 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: error instanceof ReviewError ? error.status : 500 });
}
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const user = params.get('user_id') ? uuid(params.get('user_id')) : null;
    const offset = Number(params.get('offset') ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new ReviewError('페이지 정보가 올바르지 않습니다.');
    if (params.get('scope') === 'reviewed-restaurants') {
      if (!user) throw new ReviewError('사용자 정보가 필요합니다.');
      return Response.json({ restaurantIds: await listReviewedRestaurantIds(getDb(), user) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (params.get('scope') === 'mine') {
      if (!user) throw new ReviewError('사용자 정보가 필요합니다.');
      return Response.json(await listUserReviews(getDb(), user, offset), { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const restaurant = uuid(params.get('restaurant_id'));
    return Response.json(await listReviews(getDb(), restaurant, user, offset), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
async function write(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) throw new ReviewError('허용되지 않은 요청입니다.', 403);
    const text = await request.text();
    if (text.length > 16000) throw new ReviewError('입력 내용이 너무 큽니다.', 413);
    let body;
    try { body = JSON.parse(text); } catch { throw new ReviewError('요청 형식이 올바르지 않습니다.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ReviewError('요청 형식이 올바르지 않습니다.');
    await mutateReview(getDb(), request.method, body);
    return Response.json({ ok: true }, { status: request.method === 'POST' ? 201 : 200 });
  } catch (error) { return failure(error); }
}
export const POST = write;
export const PATCH = write;
export const DELETE = write;
