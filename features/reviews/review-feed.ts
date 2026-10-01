import { reviewRequest } from './review-api';

type Page = { reviews: { id: string }[]; hasMore: boolean; nextCursor: string | null };
type Request = typeof reviewRequest;
export function createReviewFeed<P extends Page>(
  url: string | null,
  request: Request = reviewRequest,
) {
  const initial = { page: null as P | null, loading: Boolean(url), busy: false, error: '' };
  let snapshot = initial;
  let active = false;
  let generation = 0;
  let read: AbortController | null = null;
  const listeners = new Set<() => void>();
  function publish(patch: Partial<typeof initial>) {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  }
  function invalidate() {
    generation++;
    read?.abort();
    read = null;
  }
  async function load(more = false, afterMutation = false) {
    if (!active || !url || (snapshot.busy && !afterMutation)) return;
    if (more && (snapshot.loading || !snapshot.page?.nextCursor)) return;
    const cursor = more ? snapshot.page?.nextCursor : null;
    invalidate();
    const token = generation;
    read = new AbortController();
    publish({ loading: true, error: '' });
    try {
      const result = await request<P>(
        url + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''),
        { signal: read.signal },
      );
      if (!active || token !== generation) return;
      const previous = snapshot.page;
      publish({
        page:
          more && previous
            ? {
                ...result,
                reviews: [
                  ...previous.reviews,
                  ...result.reviews.filter(
                    (row) => !previous.reviews.some((old) => old.id === row.id),
                  ),
                ],
              }
            : result,
      });
    } catch (error) {
      if (active && token === generation)
        publish({ error: error instanceof Error ? error.message : '리뷰를 불러오지 못했습니다.' });
    } finally {
      if (active && token === generation) publish({ loading: false });
    }
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    start() {
      active = true;
      void load();
    },
    dispose() {
      active = false;
      invalidate();
    },
    load,
    async mutate(method: 'POST' | 'PATCH' | 'DELETE', body: object, onSuccess?: () => void) {
      if (!active || snapshot.busy) return false;
      invalidate();
      const token = generation;
      publish({ busy: true, loading: false, error: '' });
      try {
        await request('/api/reviews', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        onSuccess?.();
        if (!active || token !== generation) return false;
        await load(false, true);
        return active;
      } catch (error) {
        if (!active || token !== generation) return false;
        throw error;
      } finally {
        if (active) publish({ busy: false });
      }
    },
  };
}
