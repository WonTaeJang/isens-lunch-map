import "server-only";
import { getDb } from "./db";

export type Restaurant = {
  id: string;
  name: string;
  category: string | null;
  main_menu: string | null;
  address: string | null;
  distance: string | null;
  active: boolean | null;
  latitude: string | null;
  longitude: string | null;
  created_at: Date | null;
  updated_at: Date | null;
};

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
    throw new Error("식당 목록을 불러오지 못했습니다.");
  }
}
