import { getDb } from '@/lib/server/db';
import { likeTarget, setReviewLike } from '@/lib/server/review-likes';
import { PRIVATE_NO_STORE, readJsonObject } from '@/lib/server/api-route';
import { reviewFailure } from '@/lib/server/review-response';

export const runtime = 'nodejs';

/** POST likes, DELETE unlikes: `{ review_id, user_id }` → `{ review_id, liked, like_count }`. */
async function write(request: Request) {
  try {
    const target = likeTarget(await readJsonObject(request, 1000));
    return Response.json(await setReviewLike(getDb(), target, request.method === 'POST'), {
      headers: PRIVATE_NO_STORE,
    });
  } catch (error) {
    return reviewFailure(error);
  }
}
export const POST = write;
export const DELETE = write;
