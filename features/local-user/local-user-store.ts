export type LocalIdentity = { user_id: string; user_name: string };
const initial = { identity: null as LocalIdentity | null, ready: false, error: '' };

// One identity snapshot for every consumer. Generation guards also cover storage events
// that arrive while the nickname dictionaries are still being imported.
export function createLocalUserStore(read: () => Promise<LocalIdentity>) {
  let snapshot = initial;
  let generation = 0;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  function publish(next: typeof initial) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    initialize(force = false) {
      if (!force && (pending || snapshot.ready)) return pending ?? Promise.resolve();
      const token = ++generation;
      if (force) publish(initial);
      pending = read()
        .then((identity) => {
          if (generation === token) publish({ identity, ready: true, error: '' });
        })
        .catch(() => {
          if (generation === token)
            publish({
              identity: null,
              ready: true,
              error: '브라우저의 사용자 정보를 사용할 수 없습니다. 저장소 설정을 확인해 주세요.',
            });
        })
        .finally(() => {
          if (generation === token) pending = null;
        });
      return pending;
    },
  };
}
export const localUserStore = createLocalUserStore(async () => {
  const { ensureLocalUser } = await import('./local-user');
  const identity = ensureLocalUser(window.localStorage);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity.user_id))
    throw new Error('Invalid identity');
  return identity;
});
