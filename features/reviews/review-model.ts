import { MAX_REVIEW_LENGTH, MAX_REVIEW_TAGS, REVIEW_TAGS } from './constants';

export type Review = {
  id: string;
  user_name: string | null;
  content: string;
  is_recommended: boolean | null;
  tags: string[];
  created_at: string;
  updated_at: string | null;
  is_mine: boolean;
};
export type ReviewPage = {
  reviews: Review[];
  mine: Review | null;
  total: number;
  recommended: number;
  not_recommended: number;
  hasMore: boolean;
  nextCursor: string | null;
};
export class ReviewError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function uuid(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
    throw new ReviewError('식별 정보가 올바르지 않습니다.');
  return value.toLowerCase();
}
export function reviewInput(value: Record<string, unknown>) {
  const content = typeof value.content === 'string' ? value.content.trim() : '';
  if (!content || Array.from(content).length > MAX_REVIEW_LENGTH)
    throw new ReviewError(`리뷰는 1~${MAX_REVIEW_LENGTH.toLocaleString()}자로 입력해 주세요.`);
  if (typeof value.is_recommended !== 'boolean')
    throw new ReviewError('추천 또는 비추천을 선택해 주세요.');
  if (
    !Array.isArray(value.tags) ||
    value.tags.length > MAX_REVIEW_TAGS ||
    value.tags.some((tag) => !REVIEW_TAGS.some((option) => option.value === tag)) ||
    new Set(value.tags).size !== value.tags.length
  )
    throw new ReviewError(`태그는 정해진 항목에서 최대 ${MAX_REVIEW_TAGS}개 선택해 주세요.`);
  return { content, is_recommended: value.is_recommended, tags: value.tags as string[] };
}
export function decodeTags(raw: unknown): string[] {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(value)
      ? value.filter((tag) => REVIEW_TAGS.some((option) => option.value === tag))
      : [];
  } catch {
    return [];
  }
}

export type ReviewCounts = Record<string, { recommended: number; not_recommended: number }>;

// A failed query stays unknown; a missing restaurant has no reviews.
export function getReviewCounts(counts: ReviewCounts | null, restaurantId: string) {
  return counts === null ? null : (counts[restaurantId] ?? { recommended: 0, not_recommended: 0 });
}

export type UserReview = Review & {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_active: boolean | null;
  latitude: string | null;
  longitude: string | null;
};
export type UserReviewStats = {
  active_total: number;
  reviewed_active: number;
  recommended_active: number;
  not_recommended_active: number;
};
export type UserReviewPage = UserReviewStats & {
  reviews: UserReview[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
};
