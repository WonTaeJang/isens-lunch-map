'use client';

import { useId } from 'react';
import ModalDialog from './modal-dialog';
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
  const titleId = useId();
  const descriptionId = useId();
  return (
    <ModalDialog
      className={styles.dialog}
      data-notice={!showCancel || undefined}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={() => {
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
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        {/* App-wide order: 취소 on the left, the action on the right. */}
        {showCancel && (
          <Button variant="secondary" autoFocus disabled={busy} onClick={onCancel}>
            취소
          </Button>
        )}
        <Button autoFocus={!showCancel} loading={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </ModalDialog>
  );
}
