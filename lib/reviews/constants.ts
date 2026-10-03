// 리뷰 정책: 서버 검증과 화면에서 공통으로 사용하는 설정
export const REVIEW_PAGE_SIZE = 20;
export const MAX_REVIEW_TAGS = 3;

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
export const REVIEW_TAG_GROUPS = TAG_GROUP_LABELS.map((group) => ({
  ...group,
  tags: REVIEW_TAGS.filter((tag) => tag.group === group.value),
}));
export const MAX_REVIEW_LENGTH = 1000;
// 한국 시간 하루에 새로 작성할 수 있는 리뷰 수 (삭제한 리뷰도 포함해서 셈)
export const DAILY_REVIEW_LIMIT = 5;
