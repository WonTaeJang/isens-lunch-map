import type { ReviewVote } from '@/lib/reviews/model';
import { reviewRequest } from './review-api';

type State = { vote: ReviewVote | null; pending: boolean | null | undefined; loading: boolean };
const empty: State = { vote: null, pending: undefined, loading: false };

/** Shares saved state and write locks between the map and list for the same restaurant. */
export function createVoteStore(request: typeof reviewRequest = reviewRequest) {
  const states = new Map<string, State>();
  const running = new Map<string, Promise<ReviewVote | null>>();
  const versions = new Map<string, number>();
  const listeners = new Set<() => void>();
  const get = (key: string) => states.get(key) ?? empty;
  const set = (key: string, patch: Partial<State>) => {
    states.set(key, { ...get(key), ...patch });
    listeners.forEach((listener) => listener());
  };
  return {
    get,
    getServerSnapshot: () => empty,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load(key: string, restaurantId: string, userId: string, refresh = false) {
      const state = get(key);
      if (state.pending !== undefined || (!refresh && state.vote))
        return Promise.resolve(state.vote);
      const existing = running.get(key);
      if (existing) return existing;
      const version = versions.get(key) ?? 0;
      set(key, { loading: true });
      const task = (async () => {
        try {
          const params = new URLSearchParams({
            scope: 'vote',
            restaurant_id: restaurantId,
            user_id: userId,
          });
          const vote = await request<ReviewVote>(`/api/reviews?${params}`);
          if ((versions.get(key) ?? 0) === version) set(key, { vote });
          return get(key).vote;
        } catch {
          return null;
        } finally {
          running.delete(key);
          set(key, { loading: false });
        }
      })();
      running.set(key, task);
      return task;
    },
    begin(key: string, next: boolean | null) {
      if (get(key).pending !== undefined) return false;
      versions.set(key, (versions.get(key) ?? 0) + 1);
      set(key, { pending: next });
      return true;
    },
    finish(key: string, vote?: ReviewVote | null) {
      versions.set(key, (versions.get(key) ?? 0) + 1);
      set(key, { pending: undefined, ...(vote !== undefined ? { vote } : {}) });
    },
  };
}
export const voteStore = createVoteStore();
