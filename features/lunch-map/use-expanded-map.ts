'use client';

import { useEffect, useRef, useState } from 'react';

/** Expand in place so the map SDK and its overlays keep their identity. */
export default function useExpandedMap() {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      // A game or review dialog shown as a modal above the map owns its own Escape and focus.
      // Only modal dialogs count: a leftover `<dialog open>` must not block closing the map.
      if (isModalDialogOpen()) return;
      if (isEscape(event)) {
        event.preventDefault();
        setExpanded(false);
        expandButtonRef.current?.focus({ preventScroll: true });
      }
      if (event.key === 'Tab') {
        const controls = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
          ) ?? [],
        ).filter((node) => node.getClientRects().length);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || !panelRef.current?.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !panelRef.current?.contains(document.activeElement))
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    // Capture phase on window: runs before anything inside the page can stop the key.
    window.addEventListener('keydown', handleKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey, true);
    };
  }, [expanded]);

  return {
    expanded,
    panelRef,
    expandButtonRef,
    toggleExpanded: () => setExpanded((value) => !value),
  };
}

/**
 * Escape, also while a Korean (or other) input method is active: then some browsers report the
 * key as "Process" with keyCode 229, but the physical key code is still "Escape".
 */
function isEscape(event: KeyboardEvent) {
  return event.key === 'Escape' || event.key === 'Esc' || event.code === 'Escape';
}

function isModalDialogOpen() {
  try {
    return Boolean(document.querySelector('dialog:modal'));
  } catch {
    // Browsers without :modal: an open dialog shown as a modal sits in the top layer.
    return Array.from(document.querySelectorAll('dialog[open]')).some(
      (dialog) => dialog.getClientRects().length > 0,
    );
  }
}
