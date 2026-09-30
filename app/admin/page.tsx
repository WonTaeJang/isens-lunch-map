import type { Metadata } from 'next';
import { connection } from 'next/server';
import PageHeading from '../components/page-heading';
import SiteHeader from '../components/site-header';
import AdminManager from './admin-manager';
import { getRestaurants, type Restaurant } from '@/lib/restaurants';
export const metadata: Metadata = { title: '리스트 관리 | Lunch Map' };
export const runtime = 'nodejs';
export default async function AdminPage() {
  await connection();
  let restaurants: Restaurant[] = [];
  let error: string | null = null;
  try { restaurants = await getRestaurants(); } catch { error = 'DB 목록 조회에 실패했습니다. 연결 설정을 확인한 뒤 새로고침해 주세요.'; }
  return <><SiteHeader active="admin"/><main className="page-shell admin-shell"><PageHeading eyebrow="LUNCH MAP ADMIN" title="점심 리스트 관리" description="엑셀 전체 목록을 반영하고 식당의 활성 상태를 관리하세요."/><AdminManager error={error} restaurants={restaurants.map(({id,name,category,main_menu,address,active,distance,latitude,longitude})=>({id,name,category,main_menu,address,active,distance,latitude,longitude}))}/></main></>;
}
