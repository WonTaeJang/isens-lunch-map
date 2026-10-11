'use client';

import { useEffect, useRef } from 'react';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import {
  GRADE_POINTS,
  LIKES_COUNTED_PER_REVIEW,
  TIERS,
  nextTier,
  tierById,
  tierProgress,
  type TierId,
} from '@/lib/grades/model';
import TierIcon from './tier-icon';
import styles from './tier.module.css';

/** Every tier with the points it needs, the viewer's own marked, and how far the next one is. */
export default function TierDialog({
  tier,
  score,
  onClose,
}: {
  tier: TierId;
  /** The current score, when loaded (for the distance to the next tier). */
  score: number | null;
  onClose: () => void;
}) {
  const current = tierById(tier);
  const currentRow = useRef<HTMLLIElement>(null);
  // Open with the viewer's tier at the top of the scrolling list (lower tiers above it). Only
  // that list scrolls (not scrollIntoView, which would also move the page behind the dialog).
  useEffect(() => {
    const row = currentRow.current;
    const list = row?.closest('ol')?.parentElement;
    if (!row || !list) return;
    list.scrollTop += row.getBoundingClientRect().top - list.getBoundingClientRect().top;
  }, []);
  const next = nextTier(current);
  const progress = score === null ? null : tierProgress(current, score);
  return (
    <Modal
      title="등급"
      width={380}
      onClose={onClose}
      actions={<Button onClick={onClose}>닫기</Button>}
      header={
        <>
          <div className={styles.current}>
            <TierIcon tier={tier} size={56} />
            <div>
              <p className="subtle">현재 등급</p>
              <strong>{current.name}</strong>
              {next && score !== null && (
                <p className={styles.next}>
                  {next.name}까지 {Math.max(0, next.min - score).toLocaleString()}점 남았어요
                </p>
              )}
              {!next && <p className={styles.next}>가장 높은 등급이에요</p>}
            </div>
          </div>
          {progress !== null && (
            <div className={styles.progress} role="presentation">
              <span style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </>
      }
    >
      <ol className={styles.tiers}>
        {TIERS.map((item) => (
          <li
            key={item.id}
            ref={item.id === tier ? currentRow : undefined}
            aria-current={item.id === tier || undefined}
          >
            <TierIcon tier={item.id} size={36} />
            <span className={styles.name}>{item.name}</span>
            <span className={styles.min}>
              {item.min ? `${item.min.toLocaleString()}점` : '시작'}
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.rules}>
        리뷰 {GRADE_POINTS.contentReview}점 · 추천/비추천만 {GRADE_POINTS.voteReview}점 · 오늘의
        점심 {GRADE_POINTS.lunchVisit}점 · 받은 좋아요 {GRADE_POINTS.like}점 (리뷰당 최대{' '}
        {LIKES_COUNTED_PER_REVIEW}개). 한 번 오른 등급은 내려가지 않아요.
      </p>
    </Modal>
  );
}
