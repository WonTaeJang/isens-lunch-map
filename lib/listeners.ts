/**
 * The subscribers of a store read with useSyncExternalStore: `subscribe` adds one and returns its
 * removal, `emit` tells them all that the snapshot changed.
 */
export function createListeners() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit() {
      listeners.forEach((listener) => listener());
    },
    get size() {
      return listeners.size;
    },
  };
}
