export const REVIEW_TAGS = [
  { value: 'tasty', label: '맛있어요', group: 'positive' },
  { value: 'good_value', label: '가성비 좋아요', group: 'positive' },
  { value: 'generous_portions', label: '양이 넉넉해요', group: 'positive' },
  { value: 'quick_service', label: '빨리 나와요', group: 'positive' },
  { value: 'friendly_service', label: '친절해요', group: 'positive' },
  { value: 'clean_place', label: '매장이 깔끔해요', group: 'positive' },
  { value: 'strong_seasoning', label: '간이 강해요', group: 'negative' },
  { value: 'mild_seasoning', label: '간이 심심해요', group: 'negative' },
  { value: 'expensive', label: '가격이 부담돼요', group: 'negative' },
  { value: 'small_portions', label: '양이 아쉬워요', group: 'negative' },
  { value: 'slow_service', label: '음식이 늦게 나와요', group: 'negative' },
  { value: 'waiting', label: '웨이팅이 있어요', group: 'negative' },
  { value: 'poor_service', label: '응대가 아쉬워요', group: 'negative' },
  { value: 'noisy_place', label: '매장이 시끄러워요', group: 'negative' },
  { value: 'solo_friendly', label: '혼밥하기 좋아요', group: 'usage' },
  { value: 'group_friendly', label: '단체로 가기 좋아요', group: 'usage' },
] as const;
const TAG_GROUP_LABELS = [
  { value: 'positive', label: '좋았어요' },
  { value: 'negative', label: '아쉬웠어요' },
  { value: 'usage', label: '이용 특징' },
] as const;
export const REVIEW_TAG_GROUPS = TAG_GROUP_LABELS.map(group => ({
  ...group, tags: REVIEW_TAGS.filter(tag => tag.group === group.value),
}));
export const MAX_REVIEW_LENGTH = 1000;
export type Review = {
  id: string; user_name: string | null; content: string; is_recommended: boolean | null;
  tags: string[]; created_at: string; updated_at: string | null; is_mine: boolean;
};
export type ReviewPage = {
  reviews: Review[]; mine: Review | null;
  total: number; recommended: number; not_recommended: number; hasMore: boolean; nextCursor: string | null;
};
export class ReviewError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new ReviewError('식별 정보가 올바르지 않습니다.');
  return value.toLowerCase();
}
export function reviewInput(value: Record<string, unknown>) {
  const content = typeof value.content === 'string' ? value.content.trim() : '';
  if (!content || Array.from(content).length > MAX_REVIEW_LENGTH) throw new ReviewError('리뷰는 1~1,000자로 입력해 주세요.');
  if (typeof value.is_recommended !== 'boolean') throw new ReviewError('추천 또는 비추천을 선택해 주세요.');
  if (!Array.isArray(value.tags) || value.tags.length > 3 || value.tags.some(tag => !REVIEW_TAGS.some(option => option.value === tag)) || new Set(value.tags).size !== value.tags.length) throw new ReviewError('태그는 정해진 항목에서 최대 3개 선택해 주세요.');
  return { content, is_recommended: value.is_recommended, tags: value.tags as string[] };
}
export function decodeTags(raw: unknown): string[] {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? value.filter(tag => REVIEW_TAGS.some(option => option.value === tag)) : [];
  } catch { return []; }
}

export type ReviewCounts = Record<string, { recommended: number; not_recommended: number }>;

export type UserReview = Review & {
  restaurant_id: string; restaurant_name: string; restaurant_active: boolean | null;
  latitude: string | null; longitude: string | null;
};
export type UserReviewStats = {
  active_total: number; reviewed_active: number;
  recommended_active: number; not_recommended_active: number;
};
export type UserReviewPage = UserReviewStats & { reviews: UserReview[]; total: number; hasMore: boolean; nextCursor: string | null };
