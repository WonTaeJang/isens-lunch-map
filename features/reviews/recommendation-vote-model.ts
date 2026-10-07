import type { Review } from '@/lib/reviews/model';
import type { ReviewWriteMethod } from './review-api';

/** What a press does: ask before deleting written content, or write right away. */
export type VoteAction =
  | { type: 'confirm-delete'; review: Review }
  | { type: 'write'; method: ReviewWriteMethod; review: Review | null; next: boolean | null };

/**
 * - 내 리뷰가 없으면 내용 없이 추천/비추천 리뷰를 만들어요.
 * - 같은 버튼을 다시 누르면 삭제해요. 내용이 있으면 먼저 확인을 받아요.
 * - 반대 버튼을 누르면 내용·태그는 그대로 두고 추천 여부만 바꿔요.
 */
export function voteAction(mine: Review | null, recommended: boolean): VoteAction {
  if (!mine) return { type: 'write', method: 'POST', review: null, next: recommended };
  if (mine.is_recommended !== recommended)
    return { type: 'write', method: 'PATCH', review: mine, next: recommended };
  return mine.content.trim()
    ? { type: 'confirm-delete', review: mine }
    : { type: 'write', method: 'DELETE', review: mine, next: null };
}

/** Request fields besides the author/target: a vote alone has no content or tags. */
export function voteInput(review: Review | null, next: boolean | null) {
  return next === null
    ? {}
    : { content: review?.content ?? '', tags: review?.tags ?? [], is_recommended: next };
}

type Counts = { recommended: number; not_recommended: number };
/** Counts with the pending choice applied in place of the saved one. */
export function shownCounts(base: Counts, saved: boolean | null, choice: boolean | null): Counts {
  return {
    recommended: base.recommended - Number(saved === true) + Number(choice === true),
    not_recommended: base.not_recommended - Number(saved === false) + Number(choice === false),
  };
}
