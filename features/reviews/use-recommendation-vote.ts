'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showSnackbar } from '@/components/ui/snackbar';
import { saveStatusStore } from '@/components/ui/save-status-store';
import { reviewTarget, type Review, type ReviewCounts } from '@/lib/reviews/model';
import { ApiError, writeReview, type ReviewWriteMethod } from './review-api';
import { voteStore } from './vote-store';
import { ownReviewsStore } from './own-reviews-store';
import { shownCounts, voteAction, voteInput } from './recommendation-vote-model';
import useVoteState from './use-vote-state';

export type RecommendationVoteOptions = {
  restaurantId: string;
  /** Updated page counts invalidate any previously loaded own review. */
  counts: ReviewCounts[string] | null;
  /** Lists defer own-review requests until the first press. */
  lazy?: boolean;
  initialChoice?: boolean | null;
};

export default function useRecommendationVote({
  restaurantId,
  counts,
  lazy = false,
  initialChoice = null,
}: RecommendationVoteOptions) {
  const router = useRouter();
  const { identity, userId, key, vote, pending, busy, loading } = useVoteState(restaurantId);
  const preparing = useRef(false);
  const [confirming, setConfirming] = useState<Review | null>(null);
  // The side just chosen; `count` alternates the animation name so every choice replays it.
  const [burst, setBurst] = useState<{ value: boolean; count: number } | null>(null);

  useEffect(() => {
    if (!burst) return;
    // Sparks finish after 550ms. Clear the trigger so SDK overlay redraws cannot replay it.
    // A timer also clears it when reduced-motion disables animation events.
    const timer = window.setTimeout(() => setBurst(null), 550);
    return () => window.clearTimeout(timer);
  }, [burst]);

  useEffect(() => {
    if (userId && (!lazy || voteStore.get(key).vote))
      void voteStore.load(key, restaurantId, userId, true);
  }, [restaurantId, userId, counts, key, lazy]);

  const mine = vote?.mine ?? null;
  const saved = vote ? (mine?.is_recommended ?? null) : initialChoice;
  const choice = pending !== undefined ? pending : saved;
  const base = vote ?? counts;
  // The click shows right away; the write response confirms it.
  const shown = base && shownCounts(base, saved, choice);

  async function send(method: ReviewWriteMethod, review: Review | null, next: boolean | null) {
    if (!identity || !voteStore.begin(key, next)) return;
    const finishSave = saveStatusStore.begin();
    let success = false;
    try {
      const result = await writeReview(method, {
        user_id: identity.user_id,
        user_name: identity.user_name,
        restaurant_id: restaurantId,
        ...reviewTarget(review),
        ...voteInput(review, next),
      });
      success = true;
      voteStore.finish(key, result);
      ownReviewsStore.apply(identity.user_id, restaurantId, result.mine?.is_recommended);
      router.refresh();
    } catch (cause) {
      // A rejected daily-limit request never changed the DB: retain the previous state.
      // Conflicts or network failures need background reconciliation before another write.
      if (!(cause instanceof ApiError && cause.status === 429)) {
        voteStore.finish(key, null);
        void voteStore.load(key, restaurantId, identity.user_id, true);
      }
      showSnackbar(cause instanceof Error ? cause.message : '추천을 저장하지 못했어요.', {
        tone: 'error',
      });
    } finally {
      // The write response already contains the saved review/version and counts.
      setConfirming(null);
      if (voteStore.get(key).pending !== undefined) voteStore.finish(key);
      finishSave(success);
    }
  }

  async function press(recommended: boolean) {
    if (voteStore.get(key).pending !== undefined || preparing.current) return;
    if (!identity) {
      showSnackbar('사용자 정보를 불러오는 중이에요. 잠시 후 다시 눌러 주세요.', { tone: 'error' });
      return;
    }
    preparing.current = true;
    const current = await voteStore.load(key, restaurantId, identity.user_id);
    preparing.current = false;
    if (!current) {
      showSnackbar('추천 정보를 불러오지 못했어요. 다시 눌러 주세요.', { tone: 'error' });
      return;
    }
    if (voteStore.get(key).pending !== undefined) return;
    const action = voteAction(current.mine, recommended);
    if (action.type === 'confirm-delete') return setConfirming(action.review);
    if (action.next === recommended)
      setBurst((last) => ({ value: recommended, count: (last?.count ?? 0) + 1 }));
    void send(action.method, action.review, action.next);
  }

  return {
    busy,
    loading,
    choice,
    shown,
    burst,
    confirming,
    press,
    cancelDelete: () => setConfirming(null),
    confirmDelete: () => {
      if (confirming) void send('DELETE', confirming, null);
    },
  };
}
