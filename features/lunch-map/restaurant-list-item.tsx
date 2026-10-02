'use client';
import FavoriteToggle from '@/features/favorites/favorite-toggle';
import ReviewedBadge from '@/features/reviews/reviewed-badge';
import ReviewCountBadges from '@/features/reviews/review-counts';
import type { ReviewCounts } from '@/features/reviews/review-model';
import { formatDistance } from '@/lib/distance';
import { hasCoordinates } from '@/lib/coordinates';
import type { MapRestaurant } from '@/lib/restaurant-types';
export default function RestaurantListItem({
  reviewed,
  counts,
  row,
  selected,
  favorite,
  onSelect,
  onFavorite,
  onReviews,
}: {
  reviewed: boolean;
  counts: ReviewCounts[string] | null;
  row: MapRestaurant;
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onReviews: () => void;
}) {
  return (
    <li className="restaurant-list-item">
      <FavoriteToggle
        restaurantName={row.name}
        selected={favorite}
        className="restaurant-list-favorite"
        onClick={onFavorite}
      />
      <button
        type="button"
        className="restaurant-select"
        disabled={!hasCoordinates(row)}
        aria-label={`${row.name} 지도에서 보기`}
        aria-pressed={selected}
        onClick={onSelect}
      >
        <div className="restaurant-title">
          <div className="restaurant-list-name">
            <h3>{row.name}</h3>
            {reviewed && <ReviewedBadge />}
          </div>
          <span className="distance-badge">{formatDistance(row.distance)}</span>
        </div>
        <p className="description">
          {row.category} · {row.main_menu}
        </p>
        <p className="description">{row.address || '주소 확인 필요'}</p>
        {!hasCoordinates(row) && <span className="subtle">위치 확인 중 · 지도 이동 불가</span>}
      </button>
      <div className="restaurant-list-footer">
        <ReviewCountBadges counts={counts} />
        <button
          type="button"
          className="restaurant-review-button"
          aria-label={`${row.name} 리뷰 보기`}
          onClick={onReviews}
        >
          리뷰 보기
        </button>
      </div>
    </li>
  );
}
