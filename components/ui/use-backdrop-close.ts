'use client';

import { useRef, type MouseEvent, type PointerEvent } from 'react';

function onBackdrop(event: MouseEvent<HTMLDialogElement>) {
  // Clicks on ::backdrop are reported on the <dialog> itself, outside its box. Clicks on content
  // (or on a nested dialog's backdrop) have another target.
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

/**
 * Props for a modal <dialog> that calls `onClose` when the dark area around it is clicked, like
 * its close button. A press that starts inside (e.g. selecting text and releasing outside) does
 * not close it.
 */
export default function useBackdropClose(onClose: () => void) {
  const pressedOutside = useRef(false);
  return {
    onPointerDown(event: PointerEvent<HTMLDialogElement>) {
      pressedOutside.current = onBackdrop(event);
    },
    onClick(event: MouseEvent<HTMLDialogElement>) {
      if (pressedOutside.current && onBackdrop(event)) onClose();
      pressedOutside.current = false;
    },
  };
}
