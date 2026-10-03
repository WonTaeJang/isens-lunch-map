import { connection } from 'next/server';
import UserDashboard from '@/features/user/user-dashboard';
import { getRestaurants } from '@/lib/server/restaurants';

export default async function UserPage() {
  await connection();
  const restaurants = await getRestaurants();
  return (
    <main className="page-shell">
      <UserDashboard
        restaurants={restaurants.map(
          ({ id, name, category, main_menu, address, distance, latitude, longitude, active }) => ({
            id,
            name,
            category,
            main_menu,
            address,
            distance,
            latitude,
            longitude,
            active,
          }),
        )}
      />
    </main>
  );
}
