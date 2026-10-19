import { parseDistance } from '@/lib/distance';
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

/** A restaurant's category in the game filters; restaurants without one are grouped as 미분류. */
export const categoryOf = (row: Pick<MapRestaurant, 'category'>) => row.category || '미분류';

/**
 * Candidates for the games (slot and lunch box): the list's distance and favorite filters, never
 * its text search, optionally narrowed to `categories`.
 */
export function gameCandidates(
  rows: MapRestaurant[],
  filters: RestaurantFilters,
  favorites: ReadonlySet<string>,
  categories: readonly string[] = [],
) {
  return filterRestaurants(rows, { ...filters, query: '' }, favorites).filter(
    (row) => !categories.length || categories.includes(categoryOf(row)),
  );
}

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
    const distance = parseDistance(row.distance) ?? NaN;
    return (
      terms.every((term) => text.includes(term)) &&
      (filters.maxDistance === null ||
        (Number.isFinite(distance) && distance >= 0 && distance <= filters.maxDistance))
    );
  });
}
