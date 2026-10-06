import 'server-only';
import type { Pool } from 'pg';
import { revalidateTag, unstable_cache } from 'next/cache';
import { getDb } from './db';

import type { MapRestaurant, Restaurant, RestaurantRow } from '@/lib/restaurant-types';
export type { Restaurant } from '@/lib/restaurant-types';

/** Every column of every restaurant. Admin writes compare `revision()` of this exact result. */
export const SELECT_ALL_RESTAURANTS_SQL =
  'select id, name, category, main_menu, address, distance, active, latitude, longitude, created_at, updated_at from public.restaurants order by name, id';

// Server-only. Call from a Server Component, Route Handler or Server Action.
// Reads the existing schema without modifying any records.
export async function getRestaurants(db: Pool): Promise<Restaurant[]> {
  try {
    const { rows } = await db.query<Restaurant>(SELECT_ALL_RESTAURANTS_SQL);
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
}: RestaurantRow): MapRestaurant {
  return { id, name, category, main_menu, address, distance, latitude, longitude };
}

export function toRestaurantRow(restaurant: Restaurant): RestaurantRow {
  return { ...toMapRestaurant(restaurant), active: restaurant.active };
}

/** All restaurants (including inactive) without timestamps, for the user and admin pages. */
export async function getRestaurantRows(db: Pool): Promise<RestaurantRow[]> {
  return (await getRestaurants(db)).map(toRestaurantRow);
}

// 식당 목록 캐시: 메인 지도와 내 정보 페이지가 공유합니다. 식당은 관리자 화면에서만 바뀌므로
// 저장에 성공하면 expireRestaurantCache()로 바로 비우고, 그 외(DB 직접 수정 등)는 24시간 뒤 갱신됩니다.
// Vercel에서는 배포가 바뀌어도 캐시가 유지되므로, RestaurantRow 모양을 바꾸면 키의 버전을 올립니다.
// 관리자 화면은 항상 DB를 직접 읽습니다.
const RESTAURANTS_CACHE_TAG = 'restaurants';
const RESTAURANTS_CACHE_SECONDS = 24 * 60 * 60;
const cachedRestaurantRows = unstable_cache(
  () => getRestaurantRows(getDb()),
  ['restaurant-rows', 'v1'],
  { tags: [RESTAURANTS_CACHE_TAG], revalidate: RESTAURANTS_CACHE_SECONDS },
);

/** All restaurants (including inactive), cached. For the user page. */
export function getCachedRestaurantRows(): Promise<RestaurantRow[]> {
  return cachedRestaurantRows();
}

/** Active restaurants shown on the main map and list, cached. */
export async function getCachedMapRestaurants(): Promise<MapRestaurant[]> {
  return (await cachedRestaurantRows()).filter((row) => row.active).map(toMapRestaurant);
}

/** Call after any restaurant change is saved so the next page load reads fresh rows. */
export function expireRestaurantCache() {
  try {
    revalidateTag(RESTAURANTS_CACHE_TAG, { expire: 0 });
  } catch {
    // The change is already saved; a stale list only lasts until the cache expires.
    console.error('Restaurant cache invalidation failed');
  }
}
