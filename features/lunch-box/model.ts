import type { ReviewCounts } from '@/lib/reviews/model';
import { filterRestaurants, type RestaurantFilters } from '../lunch-map/filter-restaurants';
import type { MapRestaurant } from '@/lib/restaurant-types';

export type BoxColor = 'blue' | 'purple' | 'gold' | 'rainbow';
export type LunchBox = { restaurant: MapRestaurant; color: BoxColor };
export function pickBoxColor(value: number): BoxColor {
  return value < 0.6 ? 'blue' : value < 0.9 ? 'purple' : value < 0.99 ? 'gold' : 'rainbow';
}
export function createBoxes(
  rows: readonly MapRestaurant[],
  previousId?: string,
  random = Math.random,
): LunchBox[] {
  const pool = rows.filter((row) => rows.length === 1 || row.id !== previousId);
  const chosen: MapRestaurant[] = [];
  while (pool.length && chosen.length < 3) {
    chosen.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  // Separate draws: the visual effect never influences the restaurant selection.
  return chosen.map((restaurant) => ({
    restaurant,
    color: pickBoxColor(random()),
  }));
}

/** Games inherit distance/favorites, while text search remains local to the list. */
export function getBoxCandidates(
  rows: MapRestaurant[],
  filters: RestaurantFilters,
  favorites: ReadonlySet<string>,
  categories: readonly string[] = [],
) {
  return filterRestaurants(rows, { ...filters, query: '' }, favorites).filter(
    (row) => !categories.length || categories.includes(row.category || '미분류'),
  );
}

export type BoxHistoryEntry = LunchBox & {
  id: string;
  position: '왼쪽' | '가운데' | '오른쪽';
  counts: ReviewCounts[string] | null;
};

export function boxPosition(index: number, total: number): BoxHistoryEntry['position'] {
  if (total === 1) return '가운데';
  if (index === 0) return '왼쪽';
  return index === total - 1 ? '오른쪽' : '가운데';
}

export function countBoxColors(entries: readonly BoxHistoryEntry[]): Record<BoxColor, number> {
  const counts = { blue: 0, purple: 0, gold: 0, rainbow: 0 };
  for (const entry of entries) counts[entry.color]++;
  return counts;
}
