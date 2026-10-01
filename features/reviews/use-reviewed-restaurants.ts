'use client';

import { useEffect, useState } from 'react';
import { reviewRequest } from './review-api';
import { uuid, type ReviewCounts } from './review-model';

// Server counts are refreshed after review mutations; marker selections do not refetch.
export default function useReviewedRestaurants(reviewCounts: ReviewCounts | null) {
  const [ids, setIds] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    let controller = new AbortController();
    async function load() {
      controller.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const { ensureLocalUser } = await import('@/features/local-user/local-user');
        if (signal.aborted) return;
        const user = ensureLocalUser(window.localStorage);
        const params = new URLSearchParams({ scope: 'reviewed-restaurants', user_id: uuid(user.user_id) });
        const result = await reviewRequest<{ restaurantIds: string[] }>(`/api/reviews?${params}`, { signal });
        if (!signal.aborted) setIds(new Set(result.restaurantIds));
      } catch { if (!signal.aborted) setIds(null); }
    }
    function onStorage(event: StorageEvent) {
      if (event.key === 'user_id' || event.key === null) { setIds(null); void load(); }
    }
    void load();
    window.addEventListener('storage', onStorage);
    return () => { controller.abort(); window.removeEventListener('storage', onStorage); };
  }, [reviewCounts]);
  return ids;
}
