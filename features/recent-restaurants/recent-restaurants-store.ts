'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { onOtherTabChange, parseIdList, readStorage } from '@/lib/browser-storage';
import { createListeners } from '@/lib/listeners';

// 최근 본 식당: 상세 카드가 열린 식당 ID를 이 브라우저(localStorage)에 최근 순으로 5개까지 남깁니다.
export const RECENT_STORAGE_KEY = 'recent_restaurant_ids';
export const RECENT_LIMIT = 5;

export function readRecent(storage: Pick<Storage, 'getItem'>): string[] {
  return parseIdList(storage.getItem(RECENT_STORAGE_KEY)).slice(0, RECENT_LIMIT);
}

/** `id` first, without its older entry, at most RECENT_LIMIT. */
export function withRecent(ids: readonly string[], id: string) {
  return [id, ...ids.filter((other) => other !== id)].slice(0, RECENT_LIMIT);
}

const listeners = createListeners();
function current() {
  try {
    return readRecent(window.localStorage);
  } catch {
    return [];
  }
}
function write(ids: string[]) {
  try {
    if (ids.length) window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids));
    else window.localStorage.removeItem(RECENT_STORAGE_KEY);
  } catch {
    // Storage unavailable: the list just is not remembered.
  }
  listeners.emit();
}

export const recentRestaurants = {
  subscribe(listener: () => void) {
    const unsubscribe = listeners.subscribe(listener);
    // Other tabs of this browser share the list.
    const stopOtherTabs = onOtherTabChange(RECENT_STORAGE_KEY, listener);
    return () => {
      unsubscribe();
      stopOtherTabs();
    };
  },
  getSnapshot: () => readStorage(RECENT_STORAGE_KEY),
  add(id: string) {
    const ids = current();
    if (ids[0] !== id) write(withRecent(ids, id));
  },
  remove(id: string) {
    write(current().filter((other) => other !== id));
  },
  clear() {
    write([]);
  },
};

/** The recently viewed restaurant ids, newest first (none before hydration). */
export function useRecentRestaurantIds() {
  const raw = useSyncExternalStore(
    recentRestaurants.subscribe,
    recentRestaurants.getSnapshot,
    () => '',
  );
  return useMemo(() => readRecent({ getItem: () => raw || null }), [raw]);
}
