'use client';

import { useSyncExternalStore } from 'react';

// The page reads `#…` to receive "다른 기기에서 이어 쓰기" links. history.replaceState does not fire
// hashchange, so clearing the hash notifies subscribers directly.
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('hashchange', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('hashchange', listener);
  };
}

export function useLocationHash() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
}

/** Removes `#…` from the address bar without navigating or adding a history entry. */
export function clearLocationHash() {
  const { pathname, search } = window.location;
  // Pass null, not history.state: Next.js skips state carrying its own `__NA` marker, so the router
  // would keep the old URL and write the hash back on its next update (e.g. router.refresh()).
  window.history.replaceState(null, '', pathname + search);
  listeners.forEach((listener) => listener());
}
