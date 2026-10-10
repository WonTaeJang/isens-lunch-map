import 'server-only';
import type { Pool } from 'pg';
import { ReviewError, uuid, type ReviewLikeState } from '@/lib/reviews/model';

// Likes on review $1 before this statement's own insert/delete (CTE writes are not visible here).
const LIKES_BEFORE = '(select count(*)::int from public.review_like where review_id=$1)';

/** Validated `{ review_id, user_id }` of a like request (before any database access). */
export function likeTarget(body: Record<string, unknown>) {
  return { review: uuid(body.review_id), user: uuid(body.user_id) };
}

/**
 * Likes (`liked`) or unlikes a review for `user`; at most one like per user and review, enforced
 * by the review_like primary key. Only another user's live review with content can be liked.
 * Unliking always succeeds (also after the review was deleted).
 */
export async function setReviewLike(
  db: Pool,
  { review, user }: ReturnType<typeof likeTarget>,
  liked: boolean,
): Promise<ReviewLikeState> {
  if (!liked) {
    const { rows } = await db.query<{ like_count: number }>(
      `with removed as (
        delete from public.review_like where review_id=$1 and user_id=$2 returning review_id
      )
      select ${LIKES_BEFORE} - (select count(*)::int from removed) like_count`,
      [review, user],
    );
    return { review_id: review, liked: false, like_count: rows[0].like_count };
  }
  // One statement: the eligibility check and the insert see the same review row, and a second
  // like (double click, another tab) is absorbed by the primary key.
  const { rows } = await db.query<{
    has_content: boolean | null;
    own: boolean | null;
    like_count: number;
  }>(
    `with target as (
      select id, user_id, coalesce(btrim(content),'')<>'' has_content
      from public.review where id=$1 and enabled=true
    ), added as (
      insert into public.review_like (review_id, user_id)
      select id, $2 from target where has_content and user_id is distinct from $2
      on conflict do nothing returning review_id
    )
    select (select has_content from target) has_content,
      (select user_id=$2 from target) own,
      ${LIKES_BEFORE} + (select count(*)::int from added) like_count`,
    [review, user],
  );
  const result = rows[0];
  if (result.has_content === null) throw new ReviewError('리뷰를 찾을 수 없어요.', 404);
  if (result.own) throw new ReviewError('내 리뷰에는 좋아요를 누를 수 없어요.');
  if (!result.has_content) throw new ReviewError('내용이 있는 리뷰에만 좋아요를 누를 수 있어요.');
  return { review_id: review, liked: true, like_count: result.like_count };
}
