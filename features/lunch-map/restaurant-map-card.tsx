'use client';

import { BookmarkIcon, DirectionsIcon } from '@/components/ui/icons';
import ReviewedBadge from '@/features/reviews/reviewed-badge';
import ReviewCountBadges from '@/features/reviews/review-counts';
import type { ReviewCounts } from '@/features/reviews/review-model';
import { useState } from 'react';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { formatDistance } from '@/lib/distance';

type Props = {
  reviewed: boolean;
  restaurant: MapRestaurant;
  counts: ReviewCounts[string] | null;
  favorite: boolean;
  onReviews: () => void;
  onClose: () => void;
  onFavorite: () => string | null;
};

export default function RestaurantMapCard({
  reviewed,
  counts,
  restaurant,
  favorite,
  onClose,
  onFavorite,
  onReviews,
}: Props) {
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
      <div className="restaurant-card-header">
        <h3>{restaurant.name}</h3>
        {reviewed && <ReviewedBadge />}
      </div>
      <p className="restaurant-card-meta">
        {restaurant.category || '분류 정보 없음'}
        <span className="distance-badge">{formatDistance(restaurant.distance)}</span>
        <ReviewCountBadges counts={counts} />
      </p>
      <div className="restaurant-card-details">
        <p>{restaurant.address || '주소 확인 필요'}</p>
        <p className="restaurant-card-menu">대표메뉴 · {restaurant.main_menu || '정보 없음'}</p>
      </div>
      <div className="restaurant-card-actions">
        <button
          type="button"
          className="restaurant-card-favorite restaurant-card-icon"
          title={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          aria-pressed={favorite}
          aria-label={`${restaurant.name} 즐겨찾기 ${favorite ? '해제' : '추가'}`}
          onClick={() => setMessage(onFavorite())}
        >
          <BookmarkIcon />
        </button>
        <button type="button" className="restaurant-card-favorite" onClick={onReviews}>
          리뷰 보기
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
    </article>
  );
}
