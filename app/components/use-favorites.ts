'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { FAVORITES_CHANGED_EVENT, FAVORITES_STORAGE_KEY, readFavorites } from '@/lib/favorites';

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === FAVORITES_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(FAVORITES_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(FAVORITES_CHANGED_EVENT, onChange);
  };
}

function getSnapshot() {
  try { return window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? ''; }
  catch { return ''; }
}

export default function useFavorites() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => '');
  return useMemo(() => new Set(readFavorites({ getItem: () => raw })), [raw]);
}
