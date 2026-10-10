import { connection } from 'next/server';
import UserDashboard from '@/features/user/user-dashboard';
import { getCachedRestaurantRows } from '@/lib/server/restaurants';
import { getDb } from '@/lib/server/db';
import { getViewerBlacklist } from '@/lib/server/viewer-blacklist';
import { BlacklistSeedProvider } from '@/features/blacklist/blacklist-seed';

export default async function UserPage() {
  await connection();
  // The viewer's hidden restaurants (user cookie) are marked in 내 리뷰 as soon as reviews load.
  const [restaurants, hidden] = await Promise.all([
    getCachedRestaurantRows(),
    getViewerBlacklist(getDb()),
  ]);
  return (
    <main className="page-shell">
      <BlacklistSeedProvider seed={hidden}>
        <UserDashboard restaurants={restaurants} />
      </BlacklistSeedProvider>
    </main>
  );
}
