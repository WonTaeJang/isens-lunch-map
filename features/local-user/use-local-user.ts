'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { localUserStore } from './local-user-store';

export default function useLocalUser() {
  const state = useSyncExternalStore(
    localUserStore.subscribe,
    localUserStore.getSnapshot,
    localUserStore.getServerSnapshot,
  );
  useEffect(() => {
    void localUserStore.initialize();
  }, []);
  return state;
}
