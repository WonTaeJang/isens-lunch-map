import type { OwnRecommendations } from '@/lib/reviews/model';
import { reviewRequest } from './review-api';

/** The viewer's reviewed restaurants and their 추천/비추천, for marks on the map, list and ranking. */
export type OwnReviews = {
  owner: string;
  ids: ReadonlySet<string>;
  choices: ReadonlyMap<string, boolean | null>;
};

/**
 * One shared copy so every list on a page uses the same request. Loads for the same user while
 * one is running share it; a failed load keeps the previous copy.
 */
export function createOwnReviewsStore(request: typeof reviewRequest = reviewRequest) {
  let snapshot: OwnReviews | null = null;
  const listeners = new Set<() => void>();
  const running = new Map<string, Promise<void>>();
  let revision = 0;
  const changes = new Map<
    string,
    Map<string, { revision: number; choice: boolean | null | undefined }>
  >();
  async function fetchFor(owner: string) {
    const started = revision;
    try {
      const params = new URLSearchParams({ scope: 'reviewed-restaurants', user_id: owner });
      const { restaurants } = await request<{ restaurants: OwnRecommendations }>(
        `/api/reviews?${params}`,
      );
      const choices = new Map(Object.entries(restaurants));
      changes.get(owner)?.forEach((change, restaurantId) => {
        if (change.revision <= started) return;
        if (change.choice === undefined) choices.delete(restaurantId);
        else choices.set(restaurantId, change.choice);
      });
      snapshot = { owner, ids: new Set(choices.keys()), choices };
      listeners.forEach((listener) => listener());
    } catch {
      // Marks are optional; keep what was shown.
    } finally {
      running.delete(owner);
    }
  }
  return {
    apply(owner: string, restaurantId: string, choice: boolean | null | undefined) {
      const updates = changes.get(owner) ?? new Map();
      updates.set(restaurantId, { revision: ++revision, choice });
      changes.set(owner, updates);
      const choices = new Map(snapshot?.owner === owner ? snapshot.choices : []);
      if (choice === undefined) choices.delete(restaurantId);
      else choices.set(restaurantId, choice);
      snapshot = { owner, ids: new Set(choices.keys()), choices };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: (): OwnReviews | null => null,
    load(owner: string) {
      let task = running.get(owner);
      if (!task) {
        task = fetchFor(owner);
        running.set(owner, task);
      }
      return task;
    },
  };
}

export const ownReviewsStore = createOwnReviewsStore();
