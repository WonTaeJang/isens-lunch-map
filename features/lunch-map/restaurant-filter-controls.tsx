'use client';
import FilterChip from '@/components/ui/filter-chip';
import { BookmarkIcon } from '@/components/ui/icons';
const DISTANCE_FILTER_OPTIONS = [
  { label: '전체', value: null },
  { label: '100m 이내', value: 100 },
  { label: '200m 이내', value: 200 },
  { label: '300m 이내', value: 300 },
  { label: '500m 이내', value: 500 },
] as const;

export function DistanceFilter({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
}) {
  return (
    <div className={className} role="group" aria-label="거리 필터">
      {DISTANCE_FILTER_OPTIONS.map((option) => (
        <FilterChip
          key={option.label}
          selected={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </FilterChip>
      ))}
    </div>
  );
}
export function FavoritesFilter({
  selected,
  onChange,
}: {
  selected: boolean;
  onChange: (selected: boolean) => void;
}) {
  return (
    <FilterChip
      className="favorite-filter-chip"
      selected={selected}
      onClick={() => onChange(!selected)}
    >
      <BookmarkIcon width={14} height={16} />
      즐겨찾기만
    </FilterChip>
  );
}
