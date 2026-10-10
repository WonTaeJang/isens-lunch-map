import type { BlacklistedRestaurant } from '@/lib/blacklist/model';
import { blacklistApi, type BlacklistApi } from './blacklist-api';

/** The viewer's hidden restaurant ids, shared by the map, list, random pick, ranking and user page. */
export type Blacklist = { owner: string; ids: ReadonlySet<string> };

/**
 * The ids to show for `userId`: the shared copy once it is theirs, else what the server page looked
 * up (also before the browser's identity is known, so hydration matches the server), else null.
 */
export function visibleBlacklist(
  shared: Blacklist | null,
  seed: Blacklist | null,
  userId: string | null,
): ReadonlySet<string> | null {
  if (userId && shared?.owner === userId) return shared.ids;
  if (seed && (userId === null || seed.owner === userId)) return seed.ids;
  return null;
}

/**
 * One shared copy per page. Hiding and showing change it at once and roll back if saving fails,
 * so every list reacts together; loads for the same user while one runs share it, and changes
 * made while a load runs are kept on top of what it returns.
 */
export function createBlacklistStore(api: BlacklistApi = blacklistApi) {
  let snapshot: Blacklist | null = null;
  const listeners = new Set<() => void>();
  const running = new Map<string, Promise<BlacklistedRestaurant[]>>();
  /** Every hidden row loaded on this page, so ones shown again keep their row until a reload. */
  let seen: { owner: string; rows: Map<string, BlacklistedRestaurant> } | null = null;
  /** Changes per user made while that user's load runs, replayed over its result. */
  const changedDuringLoad = new Map<string, Map<string, boolean>>();
  function publish(next: Blacklist) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function withId(owner: string, id: string, hidden: boolean) {
    changedDuringLoad.get(owner)?.set(id, hidden);
    const ids = new Set(snapshot?.owner === owner ? snapshot.ids : []);
    if (hidden) ids.add(id);
    else ids.delete(id);
    publish({ owner, ids });
  }
  const store = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: (): Blacklist | null => null,
    /**
     * Loads the user's hidden restaurants and shares the ids. Resolves with the rows for the user
     * page: the hidden ones plus any loaded earlier on this page and shown again since, newest first.
     */
    load(owner: string) {
      let task = running.get(owner);
      if (!task) {
        const changes = new Map<string, boolean>();
        changedDuringLoad.set(owner, changes);
        task = api
          .list(owner)
          .then((rows) => {
            const ids = new Set(rows.map((row) => row.restaurant_id));
            for (const [id, hidden] of changes) {
              if (hidden) ids.add(id);
              else ids.delete(id);
            }
            publish({ owner, ids });
            if (seen?.owner !== owner) seen = { owner, rows: new Map() };
            for (const row of rows) seen.rows.set(row.restaurant_id, row);
            return [...seen.rows.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
          })
          .finally(() => {
            running.delete(owner);
            changedDuringLoad.delete(owner);
          });
        running.set(owner, task);
      }
      return task;
    },
    /** Shares ids the server page looked up, unless this user's are already shared (kept newer). */
    seed(owner: string, ids: Iterable<string>) {
      if (snapshot?.owner !== owner) publish({ owner, ids: new Set(ids) });
    },
    /** Loads the ids unless this user's are already shared (or loading) on this page. */
    ensure(owner: string) {
      if (snapshot?.owner === owner) return Promise.resolve();
      return store.load(owner).then(() => undefined);
    },
    /** Hides (`hidden`) or shows a restaurant; shown immediately, rolled back if saving fails. */
    async set(owner: string, id: string, hidden: boolean) {
      withId(owner, id, hidden);
      try {
        await api.set(owner, id, hidden);
      } catch (error) {
        withId(owner, id, !hidden);
        throw error;
      }
    },
  };
  return store;
}

export const blacklistStore = createBlacklistStore();
