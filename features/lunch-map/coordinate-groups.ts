import { hasCoordinates } from '@/lib/coordinates';
import type { MapRestaurant } from '@/lib/restaurant-types';

/** One place on the map. Compared to 7 decimals (about 1 cm), so "37.1" and "37.10" match. */
export function coordinateKey(row: Pick<MapRestaurant, 'latitude' | 'longitude'>) {
  return `${Number(row.latitude).toFixed(7)},${Number(row.longitude).toFixed(7)}`;
}

/** Restaurants with valid coordinates grouped by place, each group sorted by name. */
export function groupByCoordinates(rows: MapRestaurant[]) {
  const groups = new Map<string, MapRestaurant[]>();
  for (const row of rows) {
    if (!hasCoordinates(row)) continue;
    const key = coordinateKey(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  groups.forEach((group) => group.sort((a, b) => a.name.localeCompare(b.name, 'ko')));
  return groups;
}

/** List order at one place: favorites first, each part keeping the name order of the group. */
export function favoritesFirst(rows: MapRestaurant[], favorites: ReadonlySet<string>) {
  return [...rows].sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)));
}
