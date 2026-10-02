import type { MapRestaurant } from '@/lib/restaurant-types';

// Input is the filtered active restaurant list supplied by LunchExplorer.
export function pickRestaurant(rows: readonly MapRestaurant[], previousId?: string) {
  const candidates = rows.length > 1 ? rows.filter((row) => row.id !== previousId) : rows;
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
