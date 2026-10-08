'use client';

import { useSyncExternalStore } from 'react';
import useLocalUser from '@/features/local-user/use-local-user';
import { voteStore } from './vote-store';

/** One source of truth for a restaurant's vote and busy state across map and list. */
export default function useVoteState(restaurantId: string) {
  const { identity } = useLocalUser();
  const userId = identity?.user_id ?? null;
  const key = `${restaurantId}:${userId}`;
  const state = useSyncExternalStore(
    voteStore.subscribe,
    () => voteStore.get(key),
    voteStore.getServerSnapshot,
  );
  return { identity, userId, key, ...state, busy: state.pending !== undefined };
}
