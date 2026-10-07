'use client';

import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { showSnackbar } from '@/components/ui/snackbar';
import useLocalUser from '@/features/local-user/use-local-user';
import { reviewTarget, type Review, type ReviewCounts, type ReviewPage } from '@/lib/reviews/model';
import { reviewRequest, writeReview, type ReviewWriteMethod } from './review-api';
import RecommendationIcon from './recommendation-icon';
import ReviewDeleteDialog from './review-delete-dialog';
import { shownCounts, voteAction, voteInput } from './recommendation-vote-model';
import styles from './recommendation-vote.module.css';

type Props = {
  restaurantId: string;
  /**
   * Counts from the page data, shown until the restaurant's own counts are loaded. A new object
   * means the page data was refreshed after a review change, so the own review is reloaded too.
   */
  counts: ReviewCounts[string] | null;
  className?: string;
};

type Vote = Pick<ReviewPage, 'recommended' | 'not_recommended' | 'mine'>;

/**
 * Counts and the own review from the existing restaurant review lookup (no extra server route).
 * null when the lookup fails: the page counts stay and the buttons wait for a later load.
 */
async function fetchVote(
  restaurantId: string,
  userId: string,
  signal?: AbortSignal,
): Promise<Vote | null> {
  const params = new URLSearchParams({ restaurant_id: restaurantId, user_id: userId });
  try {
    const { recommended, not_recommended, mine } = await reviewRequest<ReviewPage>(
      `/api/reviews?${params}`,
      { signal },
    );
    return { recommended, not_recommended, mine };
  } catch {
    return null;
  }
}

/** 리뷰 작성 없이 추천/비추천을 바로 등록하는 버튼 (규칙은 recommendation-vote-model). */
export default function RecommendationVote({ restaurantId, counts, className }: Props) {
  const router = useRouter();
  const { identity } = useLocalUser();
  const userId = identity?.user_id ?? null;
  // Tagged with the restaurant and user it was loaded for, so a switch never shows stale state.
  const [loaded, setLoaded] = useState<(Vote & { key: string }) | null>(null);
  const [pending, setPending] = useState<boolean | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<Review | null>(null);

  const key = `${restaurantId}:${userId}`;
  const vote = loaded?.key === key ? loaded : null;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void fetchVote(restaurantId, userId, controller.signal).then((result) => {
      if (result && !controller.signal.aborted)
        setLoaded({ ...result, key: `${restaurantId}:${userId}` });
    });
    return () => controller.abort();
  }, [restaurantId, userId, counts]);

  const busy = pending !== undefined;
  const mine = vote?.mine ?? null;
  const saved = mine?.is_recommended ?? null;
  const choice = busy ? pending : saved;
  const base = vote ?? counts;
  // The click shows right away; the reloaded server state replaces it.
  const shown = base && shownCounts(base, saved, choice);

  async function send(method: ReviewWriteMethod, review: Review | null, next: boolean | null) {
    if (!identity) return;
    setPending(next);
    try {
      await writeReview(method, {
        user_id: identity.user_id,
        user_name: identity.user_name,
        restaurant_id: restaurantId,
        ...reviewTarget(review),
        ...voteInput(review, next),
      });
      router.refresh();
    } catch (cause) {
      showSnackbar(cause instanceof Error ? cause.message : '추천을 저장하지 못했어요.', {
        tone: 'error',
      });
    } finally {
      // Stay busy until the saved state is back, so a quick second click sees the new review.
      const result = await fetchVote(restaurantId, identity.user_id);
      if (result) setLoaded({ ...result, key });
      setConfirming(null);
      setPending(undefined);
    }
  }

  function press(recommended: boolean) {
    if (busy) return;
    // Until the own review is known, a press could create a duplicate review.
    if (!identity || !vote) {
      showSnackbar('추천 정보를 불러오는 중이에요. 잠시 후 다시 눌러 주세요.', { tone: 'error' });
      return;
    }
    const action = voteAction(mine, recommended);
    if (action.type === 'confirm-delete') setConfirming(action.review);
    else void send(action.method, action.review, action.next);
  }

  return (
    <>
      <span
        className={[styles.pill, className].filter(Boolean).join(' ')}
        aria-busy={busy || undefined}
      >
        {[true, false].map((value) => {
          const label = value ? '추천' : '비추천';
          const count = value ? shown?.recommended : shown?.not_recommended;
          return (
            <Fragment key={label}>
              {!value && <span className={styles.divider} aria-hidden="true" />}
              <button
                type="button"
                className={`${styles.button} ${value ? styles.like : styles.dislike}`}
                aria-pressed={choice === value}
                aria-label={`${label} ${count ?? '집계 불가'}`}
                title={choice === value ? `${label} 취소` : label}
                onClick={() => press(value)}
              >
                <RecommendationIcon recommended={value} size={14} />
                <span aria-hidden="true">{count ?? '—'}</span>
              </button>
            </Fragment>
          );
        })}
      </span>
      {confirming &&
        // Portaled out of the card's info row so the dialog never takes a flex slot (and gap)
        // there; Escape stops at the wrapper and closes only the dialog, not the map card.
        createPortal(
          <div onKeyDown={(event) => event.stopPropagation()}>
            <ReviewDeleteDialog
              busy={busy}
              description={`${confirming.is_recommended ? '추천' : '비추천'}을 취소하면 작성한 리뷰 내용도 함께 삭제돼요.\n삭제한 리뷰는 복구할 수 없어요.`}
              onCancel={() => setConfirming(null)}
              onConfirm={() => void send('DELETE', confirming, null)}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
