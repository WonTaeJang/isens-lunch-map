'use client';

import { useState } from 'react';
import { HeartIcon } from '@/components/ui/icons';
import { showSnackbar } from '@/components/ui/snackbar';
import useLocalUser from '@/features/local-user/use-local-user';
import type { Review } from '@/lib/reviews/model';
import { likeReview } from './review-api';
import styles from './review-like-button.module.css';

type Props = { review: Pick<Review, 'id' | 'content' | 'is_mine' | 'like_count' | 'liked'> };

/**
 * 좋아요 for a review with content: other people's reviews get a toggle button, the viewer's own
 * review shows the received count only. Reviews without content (a vote alone) show nothing.
 * Re-mount it (key) when the review's like data is reloaded.
 */
export default function ReviewLikeButton({ review }: Props) {
  const { identity } = useLocalUser();
  const [state, setState] = useState({ liked: review.liked, count: review.like_count });
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);
  if (!review.content.trim()) return null;
  const label = state.count ? `좋아요 ${state.count}` : '좋아요';

  if (review.is_mine)
    return (
      <span
        className={`${styles.like} ${styles.readonly}`}
        aria-label={`받은 좋아요 ${state.count}개`}
        title="받은 좋아요"
      >
        <HeartIcon size={14} strokeWidth="2" />
        <span aria-hidden="true">{label}</span>
      </span>
    );

  async function toggle() {
    if (busy) return;
    if (!identity) {
      showSnackbar('사용자 정보를 불러오는 중이에요. 잠시 후 다시 눌러 주세요.', { tone: 'error' });
      return;
    }
    const previous = state;
    const liked = !previous.liked;
    // Shown right away; the server's count replaces it (or the old state comes back on failure).
    setState({ liked, count: Math.max(0, previous.count + (liked ? 1 : -1)) });
    setPop(liked);
    setBusy(true);
    try {
      const result = await likeReview(review.id, identity.user_id, liked);
      setState({ liked: result.liked, count: result.like_count });
    } catch (cause) {
      setState(previous);
      showSnackbar(cause instanceof Error ? cause.message : '좋아요를 저장하지 못했어요.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.like}
      aria-pressed={state.liked}
      aria-busy={busy || undefined}
      aria-label={`리뷰 좋아요 ${state.count}개${state.liked ? ', 누름' : ''}`}
      title={state.liked ? '좋아요 취소' : '좋아요'}
      data-pop={pop || undefined}
      onClick={() => void toggle()}
      onAnimationEnd={() => setPop(false)}
    >
      <HeartIcon size={14} strokeWidth="2" />
      <span aria-hidden="true">{label}</span>
    </button>
  );
}
