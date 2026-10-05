'use client';

import { useId, type CSSProperties, type ReactNode } from 'react';
import useModalDialog from './use-modal-dialog';
import styles from './modal.module.css';

type Props = {
  /** Heading shown at the top. Leave it out and pass `labelledBy` to render your own. */
  title?: ReactNode;
  /** id of a heading rendered inside `children`, when `title` is not used. */
  labelledBy?: string;
  /** Card width in px (default 440). */
  width?: number;
  className?: string;
  /** Called by Escape as well as by the caller's own buttons. */
  onClose: () => void;
  /** Buttons at the bottom, laid out side by side in equal widths (취소 first, action last). */
  actions?: ReactNode;
  children: ReactNode;
};

/** Centered card dialog shared by the app's simple modals. */
export default function Modal({
  title,
  labelledBy,
  width,
  className,
  onClose,
  actions,
  children,
}: Props) {
  const dialog = useModalDialog();
  const titleId = useId();
  return (
    <dialog
      ref={dialog}
      className={[styles.modal, className].filter(Boolean).join(' ')}
      style={width ? ({ '--modal-width': `${width}px` } as CSSProperties) : undefined}
      aria-labelledby={title ? titleId : labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {title && (
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
      )}
      {children}
      {actions && <div className={styles.actions}>{actions}</div>}
    </dialog>
  );
}
