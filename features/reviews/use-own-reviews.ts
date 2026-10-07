'use client';

import { useEffect, useSyncExternalStore } from 'react';
import useLocalUser from '@/features/local-user/use-local-user';
import { ownReviewsStore } from './own-reviews-store';

/**
 * The viewer's reviewed restaurants and 추천/비추천 (null until loaded or without an identity).
 * Reloads when the user changes and whenever `refreshKey` changes, e.g. the page's review counts,
 * which are refreshed after every review change.
 */
export default function useOwnReviews(refreshKey?: unknown) {
  const { identity } = useLocalUser();
  const userId = identity?.user_id ?? null;
  const own = useSyncExternalStore(
    ownReviewsStore.subscribe,
    ownReviewsStore.getSnapshot,
    ownReviewsStore.getServerSnapshot,
  );
  useEffect(() => {
    if (userId) void ownReviewsStore.load(userId);
  }, [userId, refreshKey]);
  return own && own.owner === userId ? own : null;
}
