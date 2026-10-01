import type { MapRestaurant } from '@/lib/restaurant-types';

export type RestaurantFilters = {
  query: string;
  maxDistance: number | null;
  favoritesOnly: boolean;
};
export const DEFAULT_FILTERS: RestaurantFilters = {
  query: '',
  maxDistance: null,
  favoritesOnly: false,
};
const normalize = (value: string) =>
  value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, '');

export function filterRestaurants(
  rows: MapRestaurant[],
  filters: RestaurantFilters,
  favorites: ReadonlySet<string>,
) {
  const terms = filters.query.trim().split(/\s+/).filter(Boolean).map(normalize);
  return rows.filter((row) => {
    if (filters.favoritesOnly && !favorites.has(row.id)) return false;
    const text = normalize(
      [row.name, row.category, row.main_menu, row.address].filter(Boolean).join(' '),
    );
    const distance = row.distance?.trim() ? Number(row.distance) : NaN;
    return (
      terms.every((term) => text.includes(term)) &&
      (filters.maxDistance === null ||
        (Number.isFinite(distance) && distance >= 0 && distance <= filters.maxDistance))
    );
  });
}
