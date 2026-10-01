'use client';

import { useEffect } from 'react';

export default function LocalUserInitializer() {
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        // Load the word dictionaries only in the browser, after the first render.
        const { ensureLocalUser } = await import('./local-user');
        if (!cancelled) ensureLocalUser(window.localStorage);
      } catch {
        // Storage can be blocked or full. The map remains usable in that case.
        console.warn('브라우저에 사용자 정보를 저장하지 못했습니다.');
      }
    }

    void initialize();
    return () => { cancelled = true; };
  }, []);

  return null;
}
