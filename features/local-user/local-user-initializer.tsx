'use client';
import { useEffect } from 'react';
import useLocalUser from './use-local-user';
import { localUserStore } from './local-user-store';

export default function LocalUserInitializer() {
  useLocalUser();
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'user_id' || event.key === 'user_name' || event.key === null)
        void localUserStore.initialize(true);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return null;
}
