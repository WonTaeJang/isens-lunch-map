import type { LunchVisit } from '@/lib/lunch-visits/model';
import { lunchVisitApi } from './lunch-visit-api';

type Api = Pick<typeof lunchVisitApi, 'today' | 'choose' | 'cancel'>;
/** Calls `onVisible` when the page becomes visible again; returns an unsubscribe function. */
type Visibility = (onVisible: () => void) => () => void;
const documentVisibility: Visibility = (onVisible) => {
  if (typeof document === 'undefined') return () => {};
  const handle = () => {
    if (document.visibilityState === 'visible') onVisible();
  };
  document.addEventListener('visibilitychange', handle);
  return () => document.removeEventListener('visibilitychange', handle);
};
type TodayLunchState = { owner: string | null; visit: LunchVisit | null; busy: boolean };
const initial: TodayLunchState = { owner: null, visit: null, busy: false };

/**
 * One copy of today's lunch shared by every consumer (page title, map card), so a change made
 * anywhere shows up everywhere. Loads are per user; stale responses for another user are dropped.
 */
export function createTodayLunchStore(
  api: Api = lunchVisitApi,
  watchVisibility: Visibility = documentVisibility,
) {
  let state = initial;
  let loading: { owner: string; controller: AbortController } | null = null;
  const listeners = new Set<() => void>();
  // One page-visibility listener for all consumers (title, map, list, random pick): a page left
  // open past midnight, or changed in another tab, reloads once when it comes back.
  let stopWatching: (() => void) | null = null;
  function publish(patch: Partial<TodayLunchState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }
  function load(owner: string) {
    loading?.controller.abort();
    const controller = new AbortController();
    loading = { owner, controller };
    api
      .today(owner, controller.signal)
      .then(({ visit }) => {
        if (!controller.signal.aborted) publish({ owner, visit });
      })
      .catch(() => {
        if (!controller.signal.aborted) publish({ owner, visit: null });
      })
      .finally(() => {
        if (loading?.controller === controller) loading = null;
      });
  }
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      stopWatching ??= watchVisibility(() => {
        if (state.owner) load(state.owner);
      });
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stopWatching?.();
          stopWatching = null;
        }
      };
    },
    /** Loads once per user; later reloads happen when the page becomes visible again. */
    ensure(owner: string) {
      if (state.owner === owner || loading?.owner === owner) return;
      load(owner);
    },
    async choose(identity: { user_id: string; user_name: string }, restaurantId: string) {
      publish({ busy: true });
      try {
        const { visit } = await api.choose({
          user_id: identity.user_id,
          user_name: identity.user_name,
          restaurant_id: restaurantId,
        });
        loading?.controller.abort(); // A slower in-flight load must not overwrite this.
        publish({ owner: identity.user_id, visit });
        return visit;
      } finally {
        publish({ busy: false });
      }
    },
    async cancel(owner: string) {
      publish({ busy: true });
      try {
        await api.cancel(owner);
        loading?.controller.abort();
        publish({ owner, visit: null });
      } finally {
        publish({ busy: false });
      }
    },
  };
}

export const todayLunchStore = createTodayLunchStore();
