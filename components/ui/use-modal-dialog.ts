'use client';

import { useEffect, useRef } from 'react';

/** Ref for a <dialog> that opens as a modal when mounted and closes when unmounted. */
export default function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return ref;
}
