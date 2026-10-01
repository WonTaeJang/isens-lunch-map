'use client';
import FilterChip from '@/components/ui/filter-chip';
const DISTANCE_FILTER_OPTIONS = [
  { label: '전체', value: null },
  { label: '100m 이내', value: 100 },
  { label: '200m 이내', value: 200 },
  { label: '300m 이내', value: 300 },
  { label: '500m 이내', value: 500 },
] as const;

type Props = {
  query: string;
  maxDistance: number | null;
  failed: boolean;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (value: boolean) => void;
  onQueryChange: (value: string) => void;
  onDistanceChange: (value: number | null) => void;
};

export default function RestaurantFilters({
  query,
  maxDistance,
  failed,
  favoritesOnly,
  onFavoritesOnlyChange,
  onQueryChange,
  onDistanceChange,
}: Props) {
  return (
    <div className="restaurant-filters">
      <label className="search-label" htmlFor="restaurant-search">식당 검색</label>
      <input
        id="restaurant-search"
        type="search"
        className="restaurant-search"
        placeholder="식당명, 메뉴, 주소 검색"
        value={query}
        onChange={event => onQueryChange(event.target.value)}
      />
      <div className="restaurant-filter-controls">
      <div className="distance-filters" role="group" aria-label="거리 필터">
        {DISTANCE_FILTER_OPTIONS.map(option => (
          <FilterChip
            key={option.label}
            selected={maxDistance === option.value}
            onClick={() => onDistanceChange(option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>
      <FilterChip className="favorite-filter-chip" selected={favoritesOnly} onClick={() => onFavoritesOnlyChange(!favoritesOnly)}>
        <svg width="14" height="16" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 2h12v18l-6-4-6 4z" /></svg>
        즐겨찾기만
      </FilterChip>
      </div>
      {failed && <p className="subtle" role="alert">목록 조회 실패</p>}
    </div>
  );
}
