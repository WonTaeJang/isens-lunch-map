'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import useLocalUser from '@/features/local-user/use-local-user';
import { koreanToday } from '@/lib/lunch-visits/model';
import { todayLunchStore } from './today-lunch-store';

/** Today's lunch for the local user, shared across the page: load, record, cancel. */
export default function useTodayLunch() {
  const { identity } = useLocalUser();
  const state = useSyncExternalStore(
    todayLunchStore.subscribe,
    todayLunchStore.getSnapshot,
    todayLunchStore.getServerSnapshot,
  );

  useEffect(() => {
    if (identity) todayLunchStore.ensure(identity.user_id);
  }, [identity]);

  const current = identity && state.owner === identity.user_id ? state.visit : null;
  const visit = current?.visit_date === koreanToday() ? current : null;

  const choose = useCallback(
    async (restaurantId: string) => {
      if (!identity) throw new Error('사용자 정보를 확인할 수 없어 저장하지 못했습니다.');
      return todayLunchStore.choose(identity, restaurantId);
    },
    [identity],
  );
  const cancel = useCallback(async () => {
    if (!identity) throw new Error('사용자 정보를 확인할 수 없어 취소하지 못했습니다.');
    await todayLunchStore.cancel(identity.user_id);
  }, [identity]);

  return { visit, busy: state.busy, choose, cancel };
}
