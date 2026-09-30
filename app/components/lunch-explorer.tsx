"use client";
import { useState } from 'react';
import Link from 'next/link';
import { formatDistance } from '@/lib/distance';
import { hasCoordinates } from '@/lib/coordinates';
import LunchMap, { type MapRestaurant } from './lunch-map';

export default function LunchExplorer({restaurants, failed}: {restaurants: MapRestaurant[]; failed: boolean}) {
  const [focusRequest, setFocusRequest] = useState<{id: string} | null>(null);
  return (
        <div className="map-layout" id="lunch-map-layout">
          <aside className="restaurant-panel" aria-label="식당 목록">
            <div className="panel-heading"><h2>점심 리스트 <span className="count">{failed ? "—" : restaurants.length}</span></h2><span className="subtle">전체 식당</span></div>
            {failed ? <div className="list-empty" role="alert">식당 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</div> : restaurants.length ? <ul style={{maxHeight:500,overflowY:'auto'}}>{restaurants.map(row => <li key={row.id}><button type="button" className="restaurant-select" disabled={!hasCoordinates(row)} aria-label={`${row.name} 지도에서 보기`} aria-pressed={focusRequest?.id === row.id} onClick={()=>{setFocusRequest({id:row.id}); if (window.matchMedia("(max-width: 760px)").matches) document.getElementById("lunch-map-layout")?.scrollIntoView({behavior:"smooth",block:"start"});}}><div className="restaurant-title"><h3>{row.name}</h3><span className="distance-badge">{formatDistance(row.distance)}</span></div><p className="description">{row.category} · {row.main_menu}</p><p className="description">{row.address || '주소 확인 필요'}</p>{!hasCoordinates(row) && <span className="subtle">위치 확인 중 · 지도 이동 불가</span>}</button></li>)}</ul> : <div className="list-empty"><span className="empty-symbol" aria-hidden="true">⌖</span><h3>활성 식당이 없어요</h3><p>관리자 페이지에서 식당 목록을 등록해 주세요.</p><Link href="/admin" className="text-link">리스트 관리로 이동 ↗</Link></div>}
            <div className="panel-note"><span aria-hidden="true">ⓘ</span><p>식당이 등록되면 지도와 리스트에서<br />함께 확인할 수 있어요.</p></div>
          </aside>
          <LunchMap restaurants={restaurants} focusRequest={focusRequest} />
        </div>
  );
}
