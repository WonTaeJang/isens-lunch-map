'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { readFavorites } from './favorites';
import { getFavoritesSnapshot, subscribeFavorites } from './favorites-store';

export default function useFavorites() {
  const raw = useSyncExternalStore(subscribeFavorites, getFavoritesSnapshot, () => '');
  return useMemo(() => new Set(readFavorites({ getItem: () => raw })), [raw]);
}
