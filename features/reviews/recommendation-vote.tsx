'use client';

import { Fragment } from 'react';
import { createPortal } from 'react-dom';
import RecommendationIcon from './recommendation-icon';
import ReviewDeleteDialog from './review-delete-dialog';
import useRecommendationVote, { type RecommendationVoteOptions } from './use-recommendation-vote';
import styles from './recommendation-vote.module.css';

/** Shared interactive vote control for the map card and restaurant list. */
export default function RecommendationVote({
  className,
  ...options
}: RecommendationVoteOptions & { className?: string }) {
  const { busy, loading, choice, shown, burst, confirming, press, cancelDelete, confirmDelete } =
    useRecommendationVote(options);

  return (
    <>
      <span
        className={[styles.pill, className].filter(Boolean).join(' ')}
        aria-busy={busy || loading || undefined}
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
                data-burst={burst?.value === value ? (burst.count % 2 ? 'odd' : 'even') : undefined}
                disabled={busy || loading}
                onClick={() => void press(value)}
              >
                <span className={styles.icon}>
                  <RecommendationIcon recommended={value} size={14} />
                </span>
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
              onCancel={cancelDelete}
              onConfirm={confirmDelete}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
