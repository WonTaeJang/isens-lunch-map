'use client';
import { RestaurantFilterChips } from './restaurant-filter-controls';
import styles from './restaurant-filters.module.css';

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
    <div className={styles.filters}>
      <label className={styles.searchLabel} htmlFor="restaurant-search">
        식당 검색
      </label>
      <input
        id="restaurant-search"
        type="search"
        className={styles.search}
        placeholder="식당명, 메뉴, 주소 검색"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <RestaurantFilterChips
        maxDistance={maxDistance}
        favoritesOnly={favoritesOnly}
        onDistanceChange={onDistanceChange}
        onFavoritesOnlyChange={onFavoritesOnlyChange}
      />
    </div>
  );
}
