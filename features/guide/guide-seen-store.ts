'use client';

import { useSyncExternalStore } from 'react';

// 처음 방문 안내는 브라우저마다 한 번만 띄웁니다.
const GUIDE_SEEN_KEY = 'guide_seen';

export function createGuideSeenStore(storage: () => Pick<Storage, 'getItem' | 'setItem'>) {
  const listeners = new Set<() => void>();
  return {
    isSeen() {
      try {
        return storage().getItem(GUIDE_SEEN_KEY) === '1';
      } catch {
        return true; // Without storage it would reopen on every visit; skip it instead.
      }
    },
    markSeen() {
      try {
        storage().setItem(GUIDE_SEEN_KEY, '1');
      } catch {
        /* Storage unavailable: isSeen() already treats this browser as seen. */
      }
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const guideSeenStore = createGuideSeenStore(() => window.localStorage);

/** False only on the client when this browser has not seen the guide yet. */
export function useGuideSeen() {
  return useSyncExternalStore(guideSeenStore.subscribe, guideSeenStore.isSeen, () => true);
}

export const markGuideSeen = guideSeenStore.markSeen;
