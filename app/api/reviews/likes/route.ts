import { getDb } from '@/lib/server/db';
import { likeTarget, setReviewLike } from '@/lib/server/review-likes';
import { readReviewBody, reviewFailure } from '@/lib/server/review-response';

export const runtime = 'nodejs';

/** POST likes, DELETE unlikes: `{ review_id, user_id }` → `{ review_id, liked, like_count }`. */
async function write(request: Request) {
  try {
    const target = likeTarget(await readReviewBody(request, 1000));
    return Response.json(await setReviewLike(getDb(), target, request.method === 'POST'), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return reviewFailure(error);
  }
}
export const POST = write;
export const DELETE = write;
