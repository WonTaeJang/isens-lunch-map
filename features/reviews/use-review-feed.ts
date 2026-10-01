'use client';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createReviewFeed } from './review-feed';
import type { ReviewPage, UserReviewPage } from './review-model';

export default function useReviewFeed<P extends ReviewPage | UserReviewPage>(url: string | null) {
  const feed = useMemo(() => createReviewFeed<P>(url), [url]);
  const state = useSyncExternalStore(feed.subscribe, feed.getSnapshot, feed.getServerSnapshot);
  useEffect(() => { feed.start(); return () => feed.dispose(); }, [feed]);
  return { ...state, load: feed.load, mutate: feed.mutate };
}
