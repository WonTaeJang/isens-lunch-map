'use client';

import { useSyncExternalStore } from 'react';
import { CheckIcon } from './icons';
import LoadingSpinner from './loading-spinner';
import { saveStatusStore } from './save-status-store';
import styles from './save-status.module.css';

export default function SaveStatus() {
  const state = useSyncExternalStore(
    saveStatusStore.subscribe,
    saveStatusStore.getSnapshot,
    saveStatusStore.getServerSnapshot,
  );
  return (
    <div className={styles.host} role="status" aria-live="polite" aria-atomic="true">
      {state && (
        <div className={styles.indicator} title={state === 'saving' ? '저장 중' : '저장 완료'}>
          {state === 'saving' ? (
            <LoadingSpinner size={16} delayed={false} />
          ) : (
            <CheckIcon size={16} />
          )}
          <span className={styles.label}>{state === 'saving' ? '저장 중' : '저장 완료'}</span>
        </div>
      )}
    </div>
  );
}
