'use client';

import { useState } from 'react';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { formatDistance } from '@/lib/distance';

type Props = {
  restaurant: MapRestaurant;
  favorite: boolean;
  onClose: () => void;
  onFavorite: () => string | null;
};

export default function RestaurantMapCard({ restaurant, favorite, onClose, onFavorite }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <article className="restaurant-map-card" aria-label={`${restaurant.name} 상세 정보`} onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
      <button type="button" className="restaurant-card-close" aria-label="상세 정보 닫기" onClick={onClose}>×</button>
      <div className="restaurant-card-header"><h3>{restaurant.name}</h3></div>
      <p className="restaurant-card-meta">{restaurant.category || '분류 정보 없음'}<span className="distance-badge">{formatDistance(restaurant.distance)}</span></p>
      <div className="restaurant-card-details">
        <p>{restaurant.address || '주소 확인 필요'}</p>
        <p className="restaurant-card-menu">대표메뉴 · {restaurant.main_menu || '정보 없음'}</p>
      </div>
      <div className="restaurant-card-actions">
        <button type="button" className="restaurant-card-favorite" aria-pressed={favorite} aria-label={`${restaurant.name} 즐겨찾기 ${favorite ? '해제' : '추가'}`} onClick={() => setMessage(onFavorite())}>
          <svg width="18" height="20" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 2h12v18l-6-4-6 4z" /></svg>
          <span>{favorite ? '저장됨' : '즐겨찾기'}</span>
        </button>
        <a className="restaurant-card-directions" href={`https://map.kakao.com/link/to/${encodeURIComponent(restaurant.name)},${Number(restaurant.latitude)},${Number(restaurant.longitude)}`} target="_blank" rel="noopener noreferrer">길찾기 ↗</a>
      </div>
      <p className="restaurant-card-status" role="status">{message}</p>
    </article>
  );
}
