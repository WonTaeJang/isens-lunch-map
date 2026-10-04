export type SnackbarTone = 'default' | 'error';
export type Snack = { id: number; message: string; tone: SnackbarTone };
export const SNACKBAR_DURATION = 3000;

type Timers = {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};
const browserTimers: Timers = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** One snackbar at a time: a new message replaces the current one and restarts its timer. */
export function createSnackbarStore(timers: Timers = browserTimers) {
  let current: Snack | null = null;
  let sequence = 0;
  let timer: unknown = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  function hide(id?: number) {
    if (current === null || (id !== undefined && current.id !== id)) return;
    if (timer !== null) timers.clear(timer);
    timer = null;
    current = null;
    emit();
  }
  return {
    show(message: string, options: { tone?: SnackbarTone; duration?: number } = {}) {
      if (timer !== null) timers.clear(timer);
      const snack: Snack = { id: ++sequence, message, tone: options.tone ?? 'default' };
      current = snack;
      timer = timers.set(() => hide(snack.id), options.duration ?? SNACKBAR_DURATION);
      emit();
      return snack.id;
    },
    hide,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => current,
    getServerSnapshot: (): Snack | null => null,
  };
}

export const snackbarStore = createSnackbarStore();

/** Shows a short message at the bottom of the screen. Render <SnackbarHost /> once in the layout. */
export function showSnackbar(
  message: string,
  options?: { tone?: SnackbarTone; duration?: number },
) {
  return snackbarStore.show(message, options);
}
