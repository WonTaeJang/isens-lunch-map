import { getDb } from "@/lib/server/db";
import { getReviewCounts } from "@/lib/server/reviews";
import { connection } from "next/server";
import { getRestaurants, type Restaurant } from "@/lib/server/restaurants";
import LunchExplorer from "@/features/lunch-map/lunch-explorer";
import PageHeading from "@/components/ui/page-heading";
import SiteHeader from "@/components/site-header";

export default async function Home({ searchParams }: { searchParams: Promise<{ restaurant?: string | string[] }> }) {
  const requestedId = (await searchParams).restaurant;
  await connection();
  let restaurants: Restaurant[] = [];
  let failed = false;
  const [restaurantResult, countResult] = await Promise.allSettled([
    getRestaurants(), Promise.resolve().then(() => getReviewCounts(getDb())),
  ]);
  if (restaurantResult.status === 'fulfilled') restaurants = restaurantResult.value.filter(row => row.active);
  else failed = true;
  const reviewCounts = countResult.status === 'fulfilled' ? countResult.value : null;
  const initialRestaurantId = typeof requestedId === 'string' && restaurants.some(row => row.id === requestedId) ? requestedId : null;
  return (
    <>
      <SiteHeader active="map" />
      <main className="page-shell">
        <PageHeading eyebrow="YOUR LUNCH, ON THE MAP" title={<>오늘 점심, 어디로 갈까요<span>?</span></>} description="우리의 점심 리스트를 한눈에. 가까운 맛집을 지도에서 만나보세요.">
          <span className="soft-badge"><span className="live-dot" />Lunch Map</span>
        </PageHeading>
        <LunchExplorer key={initialRestaurantId ?? 'map'} initialRestaurantId={initialRestaurantId} reviewCounts={reviewCounts} failed={failed} restaurants={restaurants.map(({id,name,category,main_menu,address,distance,latitude,longitude})=>({id,name,category,main_menu,address,distance,latitude,longitude}))} />
        <footer className="page-footer"><span>좋은 점심이 만드는 작은 즐거움.</span><span>i-SENS · Lunch Map</span></footer>
      </main>
    </>
  );
}
