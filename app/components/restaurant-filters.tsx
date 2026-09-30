'use client';
import FilterChip from './filter-chip';
type Props = {query: string; maxDistance: number | null; count: number; failed: boolean; onQueryChange: (value: string) => void; onDistanceChange: (value: number | null) => void};
export default function RestaurantFilters({query, maxDistance, count, failed, onQueryChange, onDistanceChange}: Props) {
  return (
    <div className="restaurant-filters">
      <label className="search-label" htmlFor="restaurant-search">식당 검색</label>
      <input id="restaurant-search" type="search" className="restaurant-search" placeholder="식당명, 메뉴, 주소 검색" value={query} onChange={e=>onQueryChange(e.target.value)} />
      <div className="distance-filters" role="group" aria-label="거리 필터">
        {[{label:'전체',value:null},{label:'300m 이내',value:300},{label:'500m 이내',value:500},{label:'1km 이내',value:1000}].map(option=><FilterChip key={option.label} selected={maxDistance === option.value} onClick={()=>onDistanceChange(option.value)}>{option.label}</FilterChip>)}
      </div>
      <p className="subtle">등록된 거리 기준{maxDistance !== null ? ' · 거리 정보가 없는 식당 제외' : ''}</p>
      <p className="subtle" role="status">{failed ? '목록 조회 실패' : `검색 결과 ${count}곳`}</p>
    </div>
  );
}
