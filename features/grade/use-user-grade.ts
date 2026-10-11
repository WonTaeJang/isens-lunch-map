'use client';

import { useEffect } from 'react';
import { gradeScore, tierById, tierFor, tierProgress } from '@/lib/grades/model';
import type { UserReviewPage } from '@/lib/reviews/model';
import { dismissPromotion, saveReachedTier, usePromotion, useStoredTier } from './grade-store';

type GradeStats = Pick<
  UserReviewPage,
  'total' | 'content_reviews' | 'lunch_visits' | 'likes_received'
>;

/** Score from the user page's activity counts (reviews beyond those with content are votes). */
function scoreFromStats(stats: GradeStats) {
  return gradeScore({
    contentReviews: stats.content_reviews,
    voteReviews: Math.max(0, stats.total - stats.content_reviews),
    lunchVisits: stats.lunch_visits,
    likesReceived: stats.likes_received,
  });
}

/**
 * The user page's grade: recomputed whenever its activity counts load and stored in this browser
 * (only ever raised), so the stored tier is the one shown. `progress` is how far the score is
 * toward the next tier (null at the top, undefined while loading); `promotion` is set when the
 * grade goes up, for the caller to celebrate.
 */
export default function useUserGrade(userId: string | null, stats: GradeStats | null) {
  const score = stats ? scoreFromStats(stats) : null;
  const reached = score === null ? null : tierFor(score).id;
  const stored = useStoredTier(userId);
  const promotion = usePromotion();
  useEffect(() => {
    if (!userId || !reached) return;
    saveReachedTier(userId, reached);
  }, [userId, reached]);
  const tier = stored ?? reached;
  // Toward the next tier from the shown one (a stored tier can sit above the score's own).
  const progress = tier && score !== null ? tierProgress(tierById(tier), score) : undefined;
  return { tier, score, progress, promotion, dismissPromotion };
}
