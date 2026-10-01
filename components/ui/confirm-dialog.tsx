'use client';

import { useEffect, useId, useRef } from 'react';
import Button from './button';
import styles from './confirm-dialog.module.css';

type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  showCancel?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  busy = false,
  showCancel = true,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      data-notice={!showCancel || undefined}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onCancel();
      }}
    >
      {!showCancel && (
        <span className={styles.icon} aria-hidden="true">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="5" width="16" height="16" rx="3" />
            <path d="M8 3v4m8-4v4M4 11h16m-11 5 2 2 4-4" />
          </svg>
        </span>
      )}
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      {error && (
        <p className="review-error" role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button autoFocus={!showCancel} loading={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        {showCancel && (
          <Button variant="secondary" autoFocus disabled={busy} onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </dialog>
  );
}
