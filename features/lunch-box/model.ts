import type { ReviewCounts } from '@/lib/reviews/model';
import { drawRestaurants } from '@/features/lunch-map/random-model';
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
  // Separate draws: the visual effect never influences the restaurant selection.
  return drawRestaurants(rows, 3, previousId, random).map((restaurant) => ({
    restaurant,
    color: pickBoxColor(random()),
  }));
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
