"use client";
import EmptyState from './empty-state';
import CountBadge from './count-badge';
import Button from './button';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import RestaurantFilters from './restaurant-filters';
import RestaurantListItem from './restaurant-list-item';
import LunchMap from './lunch-map';
import type { MapRestaurant } from '@/lib/restaurant-types';

export default function LunchExplorer({restaurants, failed}: {restaurants: MapRestaurant[]; failed: boolean}) {
  const [focusRequest, setFocusRequest] = useState<{id: string} | null>(null);
  const [query, setQuery] = useState('');
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const filteredRestaurants = useMemo(() => {
    const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
    const terms = query.trim().split(/\s+/).filter(Boolean).map(normalize);
    return restaurants.filter(row => {
      const text = normalize([row.name, row.category, row.main_menu, row.address].filter(Boolean).join(' '));
      const distance = row.distance?.trim() ? Number(row.distance) : NaN;
      return terms.every(term => text.includes(term)) && (maxDistance === null || (Number.isFinite(distance) && distance >= 0 && distance <= maxDistance));
    });
  }, [restaurants, query, maxDistance]);
  function resetFilters() { setQuery(''); setMaxDistance(null); setFocusRequest(null); }
  return (
        <div className="map-layout" id="lunch-map-layout">
          <aside className="restaurant-panel" aria-label="식당 목록">
            <div className="panel-heading"><h2>점심 리스트 <CountBadge>{failed ? "—" : filteredRestaurants.length}</CountBadge></h2><span className="subtle">전체 {restaurants.length}곳</span></div>
            <RestaurantFilters query={query} maxDistance={maxDistance} count={filteredRestaurants.length} failed={failed} onQueryChange={value=>{setQuery(value);setFocusRequest(null);}} onDistanceChange={value=>{setMaxDistance(value);setFocusRequest(null);}} />
            {failed ? <EmptyState role="alert">식당 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</EmptyState> : filteredRestaurants.length ? <ul style={{maxHeight:500,overflowY:'auto'}}>{filteredRestaurants.map(row => <RestaurantListItem key={row.id} row={row} selected={focusRequest?.id === row.id} onSelect={()=>{setFocusRequest({id:row.id}); if (window.matchMedia('(max-width: 760px)').matches) document.getElementById('lunch-map-layout')?.scrollIntoView({behavior:'smooth',block:'start'});}} />)}</ul> : restaurants.length ? <EmptyState title="조건에 맞는 식당이 없어요" description="검색어나 거리 필터를 변경해 보세요." action={<Button onClick={resetFilters}>필터 초기화</Button>} /> : <EmptyState icon="⌖" title="활성 식당이 없어요" description="관리자 페이지에서 식당 목록을 등록해 주세요." action={<Link href="/admin" className="text-link">리스트 관리로 이동 ↗</Link>} />}
            <div className="panel-note"><span aria-hidden="true">ⓘ</span><p>식당이 등록되면 지도와 리스트에서<br />함께 확인할 수 있어요.</p></div>
          </aside>
          <LunchMap restaurants={filteredRestaurants} focusRequest={focusRequest} />
        </div>
  );
}
