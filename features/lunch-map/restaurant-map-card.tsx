'use client';

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

export default function RestaurantMapCard({ reviewed, counts, restaurant, favorite, onClose, onFavorite, onReviews }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <article className="restaurant-map-card" aria-label={`${restaurant.name} 상세 정보`} onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
      <button type="button" className="restaurant-card-close" aria-label="상세 정보 닫기" onClick={onClose}>×</button>
      <div className="restaurant-card-header"><h3>{restaurant.name}</h3>{reviewed && <span className="restaurant-card-reviewed"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>내 리뷰 작성됨</span>}</div>
      <p className="restaurant-card-meta">{restaurant.category || '분류 정보 없음'}<span className="distance-badge">{formatDistance(restaurant.distance)}</span><ReviewCountBadges counts={counts} /></p>
      <div className="restaurant-card-details">
        <p>{restaurant.address || '주소 확인 필요'}</p>
        <p className="restaurant-card-menu">대표메뉴 · {restaurant.main_menu || '정보 없음'}</p>
      </div>
      <div className="restaurant-card-actions">
        <button type="button" className="restaurant-card-favorite restaurant-card-icon" title={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'} aria-pressed={favorite} aria-label={`${restaurant.name} 즐겨찾기 ${favorite ? '해제' : '추가'}`} onClick={() => setMessage(onFavorite())}>
          <svg width="18" height="20" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 2h12v18l-6-4-6 4z" /></svg>
        </button>
        <button type="button" className="restaurant-card-favorite" onClick={onReviews}>리뷰 보기</button>
        <a className="restaurant-card-directions restaurant-card-icon" aria-label={`${restaurant.name} 길찾기 (새 탭)`} title="길찾기" href={`https://map.kakao.com/link/to/${encodeURIComponent(restaurant.name)},${Number(restaurant.latitude)},${Number(restaurant.longitude)}`} target="_blank" rel="noopener noreferrer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 10 10-10 10L2 12 12 2Z" /><path d="M8 15v-4h8m-3-3 3 3-3 3" /></svg>
        </a>
      </div>
      <p className="restaurant-card-status" role="status">{message}</p>
    </article>
  );
}
