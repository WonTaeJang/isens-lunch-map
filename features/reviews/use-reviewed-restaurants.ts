'use client';

import { useEffect, useState } from 'react';
import { reviewRequest } from './review-api';
import { type ReviewCounts } from './review-model';
import useLocalUser from '@/features/local-user/use-local-user';

// Server counts are refreshed after review mutations; marker selections do not refetch.
export default function useReviewedRestaurants(reviewCounts: ReviewCounts | null) {
  const { identity } = useLocalUser();
  const [result, setResult] = useState<{ owner: string; ids: ReadonlySet<string> } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!identity) {
        setResult(null);
        return;
      }
      try {
        const params = new URLSearchParams({
          scope: 'reviewed-restaurants',
          user_id: identity.user_id,
        });
        const response = await reviewRequest<{ restaurantIds: string[] }>(
          `/api/reviews?${params}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted)
          setResult({ owner: identity.user_id, ids: new Set(response.restaurantIds) });
      } catch {
        if (!controller.signal.aborted) setResult(null);
      }
    }
    void load();
    return () => controller.abort();
  }, [reviewCounts, identity]);
  return result?.owner === identity?.user_id ? (result?.ids ?? null) : null;
}
