'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { snackbarStore } from './snackbar-store';
import styles from './snackbar.module.css';

export { showSnackbar } from './snackbar-store';

/**
 * Renders the current snackbar. Mount once (root layout). It is a manual popover so it shows
 * above open modal dialogs too; browsers without popover support show it as a fixed element.
 */
export default function SnackbarHost() {
  const snack = useSyncExternalStore(
    snackbarStore.subscribe,
    snackbarStore.getSnapshot,
    snackbarStore.getServerSnapshot,
  );
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element || typeof element.showPopover !== 'function') return;
    try {
      // Re-opening moves it above anything opened since (e.g. a dialog).
      if (element.matches(':popover-open')) element.hidePopover();
      if (snack) element.showPopover();
    } catch {
      /* Popover state errors only affect stacking; the message is still rendered. */
    }
  }, [snack]);
  return (
    <div ref={host} popover="manual" className={styles.host} role="status" aria-live="polite">
      {snack && (
        <div key={snack.id} className={styles.snackbar} data-tone={snack.tone}>
          <span>{snack.message}</span>
          <button
            type="button"
            className={styles.close}
            aria-label="알림 닫기"
            onClick={() => snackbarStore.hide(snack.id)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
