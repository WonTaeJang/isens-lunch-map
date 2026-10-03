import { getDb } from '@/lib/server/db';
import { getReviewCounts } from '@/lib/server/reviews';
import { connection } from 'next/server';
import { getRestaurants } from '@/lib/server/restaurants';
import LunchExplorer from '@/features/lunch-map/lunch-explorer';
import PageHeading from '@/components/ui/page-heading';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ restaurant?: string | string[] }>;
}) {
  const requestedId = (await searchParams).restaurant;
  await connection();
  // Review counts are optional; a restaurant failure is handled by app/error.tsx.
  const [allRestaurants, reviewCounts] = await Promise.all([
    getRestaurants(),
    // getDb() can throw synchronously; keep it inside the promise chain.
    Promise.resolve()
      .then(() => getReviewCounts(getDb()))
      .catch(() => null),
  ]);
  const restaurants = allRestaurants.filter((row) => row.active);
  const initialRestaurantId =
    typeof requestedId === 'string' && restaurants.some((row) => row.id === requestedId)
      ? requestedId
      : null;
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="YOUR LUNCH, ON THE MAP"
        title={
          <>
            오늘 점심, 어디로 갈까요<span>?</span>
          </>
        }
        description="우리의 점심 리스트를 한눈에. 가까운 맛집을 지도에서 만나보세요."
      />
      <LunchExplorer
        key={initialRestaurantId ?? 'map'}
        initialRestaurantId={initialRestaurantId}
        reviewCounts={reviewCounts}
        restaurants={restaurants.map(
          ({ id, name, category, main_menu, address, distance, latitude, longitude }) => ({
            id,
            name,
            category,
            main_menu,
            address,
            distance,
            latitude,
            longitude,
          }),
        )}
      />
      <footer className="page-footer">
        <span>좋은 점심이 만드는 작은 즐거움.</span>
        <span>i-SENS · Lunch Map</span>
      </footer>
    </main>
  );
}
