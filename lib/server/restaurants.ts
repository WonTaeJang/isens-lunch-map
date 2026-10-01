import 'server-only';
import { getDb } from './db';

import type { Restaurant } from '@/lib/restaurant-types';
export type { Restaurant } from '@/lib/restaurant-types';

// Server-only. Call from a Server Component, Route Handler or Server Action.
// Reads the existing schema without modifying any records.
export async function getRestaurants(): Promise<Restaurant[]> {
  try {
    const { rows } = await getDb().query<Restaurant>(`
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
