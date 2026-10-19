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
import { PRIVATE_NO_STORE, readJsonObject } from '@/lib/server/api-route';
import { reviewFailure } from '@/lib/server/review-response';

export const runtime = 'nodejs';

const json = (body: unknown) => Response.json(body, { headers: PRIVATE_NO_STORE });

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const user = params.get('user_id') ? uuid(params.get('user_id')) : null;
    /** The viewer, required by every scope except the public review list. Checked (like every
     * other input) before the database is touched. */
    const viewer = () => {
      if (!user) throw new ReviewError('사용자 정보가 필요해요.');
      return user;
    };
    const cursor = decodeReviewCursor(params.get('cursor'));
    if (params.has('offset') && params.get('offset') !== '0')
      throw new ReviewError('페이지를 새로고침한 뒤 다시 조회해 주세요.');
    switch (params.get('scope')) {
      case 'review': {
        const [review, me] = [uuid(params.get('review_id')), viewer()];
        return json({ review: await getOwnReview(getDb(), review, me) });
      }
      case 'reviewed-restaurants': {
        const me = viewer();
        return json({ restaurants: await listOwnRecommendations(getDb(), me) });
      }
      case 'mine': {
        const me = viewer();
        return json(await listUserReviews(getDb(), me, cursor));
      }
    }
    const restaurant = uuid(params.get('restaurant_id'));
    if (params.get('scope') === 'vote') {
      const me = viewer();
      return json(await getReviewVote(getDb(), restaurant, me));
    }
    return json(await listReviews(getDb(), restaurant, user, cursor));
  } catch (error) {
    return reviewFailure(error);
  }
}
async function write(request: Request) {
  try {
    const body = await readJsonObject(request, 16000);
    const result = await mutateReview(getDb(), request.method, body);
    return Response.json(
      { ok: true, ...result },
      { status: request.method === 'POST' ? 201 : 200 },
    );
  } catch (error) {
    return reviewFailure(error);
  }
}
export const POST = write;
export const PATCH = write;
export const DELETE = write;
