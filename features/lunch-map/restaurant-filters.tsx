'use client';
import { DistanceFilter, FavoritesFilter } from './restaurant-filter-controls';

type Props = {
  query: string;
  maxDistance: number | null;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (value: boolean) => void;
  onQueryChange: (value: string) => void;
  onDistanceChange: (value: number | null) => void;
};

export default function RestaurantFilters({
  query,
  maxDistance,
  favoritesOnly,
  onFavoritesOnlyChange,
  onQueryChange,
  onDistanceChange,
}: Props) {
  return (
    <div className="restaurant-filters">
      <label className="search-label" htmlFor="restaurant-search">
        식당 검색
      </label>
      <input
        id="restaurant-search"
        type="search"
        className="restaurant-search"
        placeholder="식당명, 메뉴, 주소 검색"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <div className="restaurant-filter-controls">
        <DistanceFilter
          className="distance-filters"
          value={maxDistance}
          onChange={onDistanceChange}
        />
        <FavoritesFilter selected={favoritesOnly} onChange={onFavoritesOnlyChange} />
      </div>
    </div>
  );
}
