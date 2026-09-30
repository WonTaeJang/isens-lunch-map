"use client";
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistance } from '@/lib/distance';
import { hasCoordinates } from '@/lib/coordinates';
import FilterChip from './filter-chip';
import LunchMap, { type MapRestaurant } from './lunch-map';

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
            <div className="panel-heading"><h2>점심 리스트 <span className="count">{failed ? "—" : filteredRestaurants.length}</span></h2><span className="subtle">전체 {restaurants.length}곳</span></div>
            <div className="restaurant-filters">
              <label className="search-label" htmlFor="restaurant-search">식당 검색</label>
              <input id="restaurant-search" type="search" className="restaurant-search" placeholder="식당명, 메뉴, 주소 검색" value={query} onChange={e=>{setQuery(e.target.value);setFocusRequest(null);}} />
              <div className="distance-filters" role="group" aria-label="거리 필터">
                {[{label:'전체',value:null},{label:'300m 이내',value:300},{label:'500m 이내',value:500},{label:'1km 이내',value:1000}].map(option=><FilterChip key={option.label} selected={maxDistance === option.value} onClick={()=>{setMaxDistance(option.value);setFocusRequest(null);}}>{option.label}</FilterChip>)}
              </div>
              <p className="subtle">등록된 거리 기준{maxDistance !== null ? ' · 거리 정보가 없는 식당 제외' : ''}</p>
              <p className="subtle" role="status">{failed ? '목록 조회 실패' : `검색 결과 ${filteredRestaurants.length}곳`}</p>
            </div>
            {failed ? <div className="list-empty" role="alert">식당 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</div> : filteredRestaurants.length ? <ul style={{maxHeight:500,overflowY:'auto'}}>{filteredRestaurants.map(row => <li key={row.id}><button type="button" className="restaurant-select" disabled={!hasCoordinates(row)} aria-label={`${row.name} 지도에서 보기`} aria-pressed={focusRequest?.id === row.id} onClick={()=>{setFocusRequest({id:row.id}); if (window.matchMedia("(max-width: 760px)").matches) document.getElementById("lunch-map-layout")?.scrollIntoView({behavior:"smooth",block:"start"});}}><div className="restaurant-title"><h3>{row.name}</h3><span className="distance-badge">{formatDistance(row.distance)}</span></div><p className="description">{row.category} · {row.main_menu}</p><p className="description">{row.address || '주소 확인 필요'}</p>{!hasCoordinates(row) && <span className="subtle">위치 확인 중 · 지도 이동 불가</span>}</button></li>)}</ul> : restaurants.length ? <div className="list-empty"><h3>조건에 맞는 식당이 없어요</h3><p>검색어나 거리 필터를 변경해 보세요.</p><button type="button" className="button" onClick={resetFilters}>필터 초기화</button></div> : <div className="list-empty"><span className="empty-symbol" aria-hidden="true">⌖</span><h3>활성 식당이 없어요</h3><p>관리자 페이지에서 식당 목록을 등록해 주세요.</p><Link href="/admin" className="text-link">리스트 관리로 이동 ↗</Link></div>}
            <div className="panel-note"><span aria-hidden="true">ⓘ</span><p>식당이 등록되면 지도와 리스트에서<br />함께 확인할 수 있어요.</p></div>
          </aside>
          <LunchMap restaurants={filteredRestaurants} focusRequest={focusRequest} />
        </div>
  );
}
