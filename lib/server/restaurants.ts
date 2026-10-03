import 'server-only';
import type { Pool } from 'pg';

import type { MapRestaurant, Restaurant, RestaurantRow } from '@/lib/restaurant-types';
export type { Restaurant } from '@/lib/restaurant-types';

// Server-only. Call from a Server Component, Route Handler or Server Action.
// Reads the existing schema without modifying any records.
export async function getRestaurants(db: Pool): Promise<Restaurant[]> {
  try {
    const { rows } = await db.query<Restaurant>(`
      select id, name, category, main_menu, address, distance,
             active, latitude, longitude, created_at, updated_at
      from public.restaurants
      order by name, id
    `);
    return rows;
  } catch {
    // Do not propagate driver errors containing connection or schema details.
    throw new Error('식당 목록을 불러오지 못했습니다.');
  }
}

// Fields are picked explicitly so new DB columns are never sent to the browser by accident.
export function toMapRestaurant({
  id,
  name,
  category,
  main_menu,
  address,
  distance,
  latitude,
  longitude,
}: Restaurant): MapRestaurant {
  return { id, name, category, main_menu, address, distance, latitude, longitude };
}

export function toRestaurantRow(restaurant: Restaurant): RestaurantRow {
  return { ...toMapRestaurant(restaurant), active: restaurant.active };
}

/** All restaurants (including inactive) without timestamps, for the user and admin pages. */
export async function getRestaurantRows(db: Pool): Promise<RestaurantRow[]> {
  return (await getRestaurants(db)).map(toRestaurantRow);
}

/** Active restaurants shown on the main map and list. */
export async function getActiveMapRestaurants(db: Pool): Promise<MapRestaurant[]> {
  return (await getRestaurants(db)).filter((row) => row.active).map(toMapRestaurant);
}
