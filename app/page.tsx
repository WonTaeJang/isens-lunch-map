import { getDb } from '@/lib/server/db';
import { getReviewCounts } from '@/lib/server/reviews';
import { connection } from 'next/server';
import { getCachedMapRestaurants } from '@/lib/server/restaurants';
import LunchExplorer from '@/features/lunch-map/lunch-explorer';
import PageHeading from '@/components/ui/page-heading';
import TodayLunchTitle from '@/features/lunch-visits/today-lunch-title';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ restaurant?: string | string[] }>;
}) {
  const requestedId = (await searchParams).restaurant;
  await connection();
  const db = getDb();
  // Review counts are optional; a restaurant failure is handled by app/error.tsx.
  const [restaurants, reviewCounts] = await Promise.all([
    getCachedMapRestaurants(),
    getReviewCounts(db).catch(() => null),
  ]);
  const initialRestaurantId =
    typeof requestedId === 'string' && restaurants.some((row) => row.id === requestedId)
      ? requestedId
      : null;
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="YOUR LUNCH, ON THE MAP"
        title={<TodayLunchTitle />}
        description="우리의 점심 리스트를 한눈에. 가까운 맛집을 지도에서 만나보세요."
      />
      <LunchExplorer
        key={initialRestaurantId ?? 'map'}
        initialRestaurantId={initialRestaurantId}
        reviewCounts={reviewCounts}
        restaurants={restaurants}
      />
      <footer className="page-footer">
        <span>좋은 점심이 만드는 작은 즐거움.</span>
        <span>i-SENS · Lunch Map</span>
      </footer>
    </main>
  );
}
