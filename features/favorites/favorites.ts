import { parseIdList } from '@/lib/browser-storage';

export const FAVORITES_STORAGE_KEY = 'favorite_restaurant_ids';
export const FAVORITES_CHANGED_EVENT = 'lunch-favorites-changed';
type FavoriteStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readFavorites(storage: Pick<Storage, 'getItem'>): string[] {
  return parseIdList(storage.getItem(FAVORITES_STORAGE_KEY));
}

export function toggleFavorite(storage: FavoriteStorage, id: string): string[] {
  const favorites = new Set(readFavorites(storage));
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  const next = [...favorites];
  storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
  return next;
}
