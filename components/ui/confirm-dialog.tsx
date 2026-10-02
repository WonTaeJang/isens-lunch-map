'use client';

import { useEffect, useId, useRef } from 'react';
import Button from './button';
import { CalendarCheckIcon } from '@/components/ui/icons';
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
          <CalendarCheckIcon strokeWidth="1.7" />
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
