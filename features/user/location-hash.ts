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
  window.history.replaceState(window.history.state, '', pathname + search);
  listeners.forEach((listener) => listener());
}
