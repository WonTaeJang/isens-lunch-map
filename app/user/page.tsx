import { connection } from 'next/server';
import SiteHeader from '@/components/site-header';
import UserDashboard from '@/features/user/user-dashboard';
import { getRestaurants, type Restaurant } from '@/lib/server/restaurants';

export default async function UserPage() {
  await connection();
  let restaurants: Restaurant[] = [];
  let failed = false;
  try { restaurants = await getRestaurants(); } catch { failed = true; }
  return <><SiteHeader active="user" /><main className="page-shell">
    <UserDashboard failed={failed} restaurants={restaurants.map(({ id, name, category, main_menu, address, distance, latitude, longitude, active }) => ({ id, name, category, main_menu, address, distance, latitude, longitude, active }))} />
  </main></>;
}
