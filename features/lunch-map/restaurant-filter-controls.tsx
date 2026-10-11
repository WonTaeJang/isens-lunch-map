'use client';
import FilterChip from '@/components/ui/filter-chip';
import { BookmarkIcon } from '@/components/ui/icons';
const DISTANCE_FILTER_OPTIONS = [
  { label: '전체', value: null },
  { label: '100m', value: 100 },
  { label: '200m', value: 200 },
  { label: '300m', value: 300 },
  { label: '500m', value: 500 },
] as const;

/**
 * The filter chip row shared by the lunch list and the random pick: the 즐겨찾기만 icon first,
 * then the distance chips.
 */
export function RestaurantFilterChips({
  maxDistance,
  favoritesOnly,
  onDistanceChange,
  onFavoritesOnlyChange,
  className,
}: {
  maxDistance: number | null;
  favoritesOnly: boolean;
  onDistanceChange: (value: number | null) => void;
  onFavoritesOnlyChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <div
      className={
        className ? `restaurant-filter-controls ${className}` : 'restaurant-filter-controls'
      }
    >
      <FilterChip
        className="favorite-filter-chip"
        selected={favoritesOnly}
        label="즐겨찾기만 보기"
        onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
      >
        <BookmarkIcon width={14} height={16} />
      </FilterChip>
      <div className="distance-filters" role="group" aria-label="거리 필터">
        {DISTANCE_FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.label}
            selected={maxDistance === option.value}
            // Short on screen ("100m"); read out and shown on hover as "100m 이내".
            label={option.value === null ? undefined : `${option.label} 이내`}
            onClick={() => onDistanceChange(option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}
