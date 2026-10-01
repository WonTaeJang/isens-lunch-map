export const FAVORITES_STORAGE_KEY = 'favorite_restaurant_ids';
export const FAVORITES_CHANGED_EVENT = 'lunch-favorites-changed';
type FavoriteStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readFavorites(storage: Pick<Storage, 'getItem'>): string[] {
  const raw = storage.getItem(FAVORITES_STORAGE_KEY);
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))]
      : [];
  } catch { return []; }
}

export function toggleFavorite(storage: FavoriteStorage, id: string): string[] {
  const favorites = new Set(readFavorites(storage));
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  const next = [...favorites];
  storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
  return next;
}
