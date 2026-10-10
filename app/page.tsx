import { getDb } from '@/lib/server/db';
import { getReviewCounts } from '@/lib/server/reviews';
import { connection } from 'next/server';
import { getCachedMapRestaurants } from '@/lib/server/restaurants';
import LunchExplorer from '@/features/lunch-map/lunch-explorer';
import PageHeading from '@/components/ui/page-heading';
import TodayLunchTitle from '@/features/lunch-visits/today-lunch-title';
import FirstVisitGuide from '@/features/guide/first-visit-guide';
import { BlacklistSeedProvider } from '@/features/blacklist/blacklist-seed';
import { getViewerBlacklist } from '@/lib/server/viewer-blacklist';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ restaurant?: string | string[]; reviews?: string | string[] }>;
}) {
  const { restaurant: requestedId, reviews } = await searchParams;
  await connection();
  const db = getDb();
  // Review counts are optional; a restaurant failure is handled by app/error.tsx.
  // The viewer's hidden restaurants (user cookie) are left out from the first render.
  const [restaurants, reviewCounts, hidden] = await Promise.all([
    getCachedMapRestaurants(),
    getReviewCounts(db).catch(() => null),
    getViewerBlacklist(db),
  ]);
  const initialRestaurantId =
    typeof requestedId === 'string' && restaurants.some((row) => row.id === requestedId)
      ? requestedId
      : null;
  const initialReviewsOpen = initialRestaurantId !== null && reviews === '1';
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="YOUR LUNCH, ON THE MAP"
        title={<TodayLunchTitle />}
        description="우리의 점심 리스트를 한눈에. 가까운 맛집을 지도에서 만나보세요."
      />
      <BlacklistSeedProvider seed={hidden}>
        <LunchExplorer
          key={initialRestaurantId ? `${initialRestaurantId}:${initialReviewsOpen}` : 'map'}
          initialRestaurantId={initialRestaurantId}
          initialReviewsOpen={initialReviewsOpen}
          reviewCounts={reviewCounts}
          restaurants={restaurants}
        />
      </BlacklistSeedProvider>
      <FirstVisitGuide />
      <footer className="page-footer">
        <span>좋은 점심이 만드는 작은 즐거움.</span>
        <span>i-SENS · Lunch Map</span>
      </footer>
    </main>
  );
}
