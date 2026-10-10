'use client';

import { DirectionsIcon } from '@/components/ui/icons';
import FavoriteToggle from '@/features/favorites/favorite-toggle';
import HideButton from '@/features/blacklist/hide-button';
import TodayLunchButton from '@/features/lunch-visits/today-lunch-button';
import ReviewedBadge from '@/features/reviews/reviewed-badge';
import useVoteState from '@/features/reviews/use-vote-state';
import RecommendationVote from '@/features/reviews/recommendation-vote';
import type { ReviewCounts } from '@/lib/reviews/model';
import { useState } from 'react';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { formatDistance } from '@/lib/distance';

type Props = {
  reviewed: boolean;
  restaurant: MapRestaurant;
  counts: ReviewCounts[string] | null;
  favorite: boolean;
  /** This restaurant is today's lunch. */
  todayLunch: boolean;
  todayLunchBusy: boolean;
  onReviews: () => void;
  onClose: () => void;
  onFavorite: () => string | null;
  /** Records, changes (after confirmation) or cancels today's lunch and shows the result in a
   * snackbar. `chosen` is true only when this restaurant just became today's lunch. */
  onTodayLunch: () => Promise<{ chosen: boolean }>;
};

export default function RestaurantMapCard({
  reviewed,
  counts,
  restaurant,
  favorite,
  todayLunch,
  todayLunchBusy,
  onClose,
  onFavorite,
  onReviews,
  onTodayLunch,
}: Props) {
  const { busy: voteBusy } = useVoteState(restaurant.id);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <article
      className="restaurant-map-card"
      aria-label={`${restaurant.name} 상세 정보`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <button
        type="button"
        className="restaurant-card-close"
        aria-label="상세 정보 닫기"
        onClick={onClose}
      >
        ×
      </button>
      <div inert={voteBusy} aria-busy={voteBusy || undefined}>
        <div className="restaurant-card-header">
          <h3>{restaurant.name}</h3>
          {reviewed && <ReviewedBadge />}
        </div>
        <div className="restaurant-card-meta">
          {restaurant.category || '분류 정보 없음'}
          <span className="distance-badge">{formatDistance(restaurant.distance)}</span>
          <RecommendationVote
            restaurantId={restaurant.id}
            counts={counts}
            className="restaurant-card-vote"
          />
        </div>
        <div className="restaurant-card-details">
          <p>{restaurant.address || '주소 확인 필요'}</p>
          <p className="restaurant-card-menu">대표메뉴 · {restaurant.main_menu || '정보 없음'}</p>
        </div>
        <div className="restaurant-card-actions">
          <FavoriteToggle
            restaurantName={restaurant.name}
            selected={favorite}
            onClick={() => setMessage(onFavorite())}
          />
          <HideButton
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            favorite={favorite}
            todayLunch={todayLunch}
          />
          <TodayLunchButton
            restaurantName={restaurant.name}
            active={todayLunch}
            busy={todayLunchBusy}
            onToggle={onTodayLunch}
          />
          <button
            type="button"
            className="restaurant-card-review"
            aria-label={`${restaurant.name} 리뷰 보기`}
            onClick={onReviews}
          >
            리뷰
          </button>
          <a
            className="restaurant-card-directions restaurant-card-icon"
            aria-label={`${restaurant.name} 길찾기 (새 탭)`}
            title="길찾기"
            href={`https://map.kakao.com/link/to/${encodeURIComponent(restaurant.name)},${Number(restaurant.latitude)},${Number(restaurant.longitude)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DirectionsIcon size={20} />
          </a>
        </div>
        <p className="restaurant-card-status" role="status">
          {message}
        </p>
      </div>
      {voteBusy && <div className="restaurant-card-saving" aria-hidden="true" />}
    </article>
  );
}
