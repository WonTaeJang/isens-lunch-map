import { createListeners } from '@/lib/listeners';
/** Tracks saves independently of the card that started them. */
export function createSaveStatusStore() {
  let state: 'saving' | 'saved' | null = null;
  let pending = 0;
  let failed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = createListeners();
  const emit = listeners.emit;
  return {
    subscribe: listeners.subscribe,
    getSnapshot: () => state,
    getServerSnapshot: () => null,
    begin() {
      clearTimeout(timer);
      if (pending === 0) failed = false;
      pending++;
      state = 'saving';
      emit();
      let finished = false;
      return (success: boolean) => {
        if (finished) return;
        finished = true;
        failed ||= !success;
        if (--pending > 0) return;
        state = failed ? null : 'saved';
        emit();
        if (state === 'saved')
          timer = setTimeout(() => {
            state = null;
            emit();
          }, 1200);
      };
    },
  };
}
export const saveStatusStore = createSaveStatusStore();
