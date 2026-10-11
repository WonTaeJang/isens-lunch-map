// 사용자 등급: 활동을 점수로 바꾸는 배점과 9단계 등급 구간 (화면·서버 공용)

/** Points per activity. A vote-only review (no content) is worth little so votes alone cannot farm. */
export const GRADE_POINTS = {
  contentReview: 10,
  voteReview: 2,
  lunchVisit: 3,
  like: 5,
} as const;
/** Likes counted per review: identities are per browser, so a review's likes stop adding points here. */
export const LIKES_COUNTED_PER_REVIEW = 5;

export const TIERS = [
  { id: 'iron', name: '아이언', min: 0 },
  { id: 'bronze', name: '브론즈', min: 30 },
  { id: 'silver', name: '실버', min: 100 },
  { id: 'gold', name: '골드', min: 250 },
  { id: 'platinum', name: '플래티넘', min: 500 },
  { id: 'diamond', name: '다이아몬드', min: 900 },
  { id: 'master', name: '마스터', min: 1500 },
  { id: 'grandmaster', name: '그랜드마스터', min: 2500 },
  { id: 'challenger', name: '챌린저', min: 4000 },
] as const;
export type Tier = (typeof TIERS)[number];
export type TierId = Tier['id'];
/** Tiers one can be promoted to (아이언 is where everyone starts). */
export type PromotedTierId = Exclude<TierId, 'iron'>;

/** What the grade is made of; likes are already capped per review (LIKES_COUNTED_PER_REVIEW). */
export type GradeActivity = {
  contentReviews: number;
  voteReviews: number;
  lunchVisits: number;
  likesReceived: number;
};

export function gradeScore(activity: GradeActivity) {
  return (
    activity.contentReviews * GRADE_POINTS.contentReview +
    activity.voteReviews * GRADE_POINTS.voteReview +
    activity.lunchVisits * GRADE_POINTS.lunchVisit +
    activity.likesReceived * GRADE_POINTS.like
  );
}

/** The highest tier the score reaches. */
export function tierFor(score: number): Tier {
  let reached: Tier = TIERS[0];
  for (const tier of TIERS) if (score >= tier.min) reached = tier;
  return reached;
}

/** Position in TIERS (higher is better), or -1 for an unknown id. */
export function tierRank(id: string) {
  return TIERS.findIndex((tier) => tier.id === id);
}

export function tierById(id: TierId): Tier {
  return TIERS[tierRank(id)];
}

export function isTierId(value: unknown): value is TierId {
  return typeof value === 'string' && tierRank(value) >= 0;
}

/** The tier after `tier`, or null at the top. */
export function nextTier(tier: Tier): Tier | null {
  return TIERS[tierRank(tier.id) + 1] ?? null;
}

/** How far `score` has come from `tier` toward the next tier (0 to 1), or null at the top. */
export function tierProgress(tier: Tier, score: number): number | null {
  const next = nextTier(tier);
  if (!next) return null;
  return Math.min(1, Math.max(0, (score - tier.min) / (next.min - tier.min)));
}
