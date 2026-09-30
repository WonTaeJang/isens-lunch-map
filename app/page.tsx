import { connection } from "next/server";
import { getRestaurants, type Restaurant } from "@/lib/restaurants";
import LunchExplorer from "./components/lunch-explorer";
import SiteHeader from "./components/site-header";

export default async function Home() {
  await connection();
  let restaurants: Restaurant[] = [];
  let failed = false;
  try { restaurants = (await getRestaurants()).filter(row => row.active); } catch { failed = true; }
  return (
    <>
      <SiteHeader active="map" />
      <main className="page-shell">
        <div className="page-heading">
          <div><p className="eyebrow">YOUR LUNCH, ON THE MAP</p><h1>오늘 점심, 어디로 갈까요<span>?</span></h1><p className="description">우리의 점심 리스트를 한눈에. 가까운 맛집을 지도에서 만나보세요.</p></div>
          <span className="soft-badge"><span className="live-dot" />Lunch Map</span>
        </div>
        <LunchExplorer failed={failed} restaurants={restaurants.map(({id,name,category,main_menu,address,distance,latitude,longitude})=>({id,name,category,main_menu,address,distance,latitude,longitude}))} />
        <footer className="page-footer"><span>좋은 점심이 만드는 작은 즐거움.</span><span>i-SENS · Lunch Map</span></footer>
      </main>
    </>
  );
}
