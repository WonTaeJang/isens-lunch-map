'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { showSnackbar } from '@/components/ui/snackbar';
import useLocalUser from '@/features/local-user/use-local-user';
import { blacklistStore } from './blacklist-store';

/**
 * The viewer's hidden restaurant ids (null until loaded or without an identity) and a setter.
 * They are loaded once and shared, so opening another map card does not ask again;
 * hiding/showing updates every user of the hook.
 */
export default function useBlacklist() {
  const { identity } = useLocalUser();
  const userId = identity?.user_id ?? null;
  const state = useSyncExternalStore(
    blacklistStore.subscribe,
    blacklistStore.getSnapshot,
    blacklistStore.getServerSnapshot,
  );
  useEffect(() => {
    // A failed load leaves the list unfiltered; the user page tab shows its own error.
    if (userId) void blacklistStore.ensure(userId).catch(() => undefined);
  }, [userId]);
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
  return { ids: state && state.owner === userId ? state.ids : null, setHidden };
}
