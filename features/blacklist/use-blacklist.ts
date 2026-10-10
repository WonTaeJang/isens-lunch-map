'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { showSnackbar } from '@/components/ui/snackbar';
import useLocalUser from '@/features/local-user/use-local-user';
import { blacklistStore, visibleBlacklist } from './blacklist-store';
import { useBlacklistSeed } from './blacklist-seed';

/**
 * The viewer's hidden restaurant ids (null while unknown) and a setter. A server page that read
 * the user cookie hands them over through `BlacklistSeedProvider`, so they apply from the first
 * render; otherwise they are loaded once and shared. Hiding/showing updates every user of the hook.
 */
export default function useBlacklist() {
  const { identity } = useLocalUser();
  // Lowercase like the server's ids (the seed's owner comes from the cookie, stored lowercase).
  const userId = identity?.user_id.toLowerCase() ?? null;
  const seed = useBlacklistSeed();
  const state = useSyncExternalStore(
    blacklistStore.subscribe,
    blacklistStore.getSnapshot,
    blacklistStore.getServerSnapshot,
  );
  useEffect(() => {
    if (!userId) return;
    // The server already looked this user's list up: share it instead of asking again.
    if (seed?.owner === userId) blacklistStore.seed(userId, seed.ids);
    // A failed load leaves the list unfiltered; the user page tab shows its own error.
    else void blacklistStore.ensure(userId).catch(() => undefined);
  }, [userId, seed]);
  /** Hides or shows a restaurant; a failure is shown in an error snackbar. Resolves to whether it saved. */
  const setHidden = useCallback(
    async (restaurantId: string, hidden: boolean) => {
      try {
        if (!userId)
          throw new Error('사용자 정보를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.');
        await blacklistStore.set(userId, restaurantId, hidden);
        return true;
      } catch (cause) {
        showSnackbar(cause instanceof Error ? cause.message : '숨긴 식당을 저장하지 못했어요.', {
          tone: 'error',
        });
        return false;
      }
    },
    [userId],
  );
  return { ids: visibleBlacklist(state, seed, userId), setHidden };
}
