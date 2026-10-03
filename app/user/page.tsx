import { connection } from 'next/server';
import UserDashboard from '@/features/user/user-dashboard';
import { getDb } from '@/lib/server/db';
import { getRestaurantRows } from '@/lib/server/restaurants';

export default async function UserPage() {
  await connection();
  const restaurants = await getRestaurantRows(getDb());
  return (
    <main className="page-shell">
      <UserDashboard restaurants={restaurants} />
    </main>
  );
}
