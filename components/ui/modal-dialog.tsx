'use client';

import { useEffect, useRef, type ComponentProps } from 'react';

type Props = Omit<ComponentProps<'dialog'>, 'ref' | 'open' | 'onCancel'> & {
  /** Escape calls this instead of closing the dialog, so the caller decides how and when
   * (after an animation, or not while saving). */
  onClose: () => void;
};

/**
 * The <dialog> under every modal in the app: shown as a modal while mounted (closed on unmount), with Escape handled
 * by `onClose` and kept from reaching an outer dialog. Each caller keeps its own look and layout.
 */
export default function ModalDialog({ onClose, children, ...props }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      {...props}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
