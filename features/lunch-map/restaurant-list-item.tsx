'use client';
import { formatDistance } from '@/lib/distance';
import { hasCoordinates } from '@/lib/coordinates';
import type { MapRestaurant } from '@/lib/restaurant-types';
export default function RestaurantListItem({row, selected, favorite, onSelect, onFavorite}: {row: MapRestaurant; selected: boolean; favorite: boolean; onSelect: () => void; onFavorite: () => void}) {
  return (
    <li className="restaurant-list-item">
      <button type="button" className="restaurant-list-favorite" aria-label={`${row.name} 즐겨찾기 ${favorite ? '해제' : '추가'}`} aria-pressed={favorite} onClick={onFavorite}>
        <svg width="18" height="20" viewBox="0 0 18 22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 2h12v18l-6-4-6 4z" /></svg>
      </button>
      <button type="button" className="restaurant-select" disabled={!hasCoordinates(row)} aria-label={`${row.name} 지도에서 보기`} aria-pressed={selected} onClick={onSelect}>
        <div className="restaurant-title"><h3>{row.name}</h3><span className="distance-badge">{formatDistance(row.distance)}</span></div>
        <p className="description">{row.category} · {row.main_menu}</p>
        <p className="description">{row.address || '주소 확인 필요'}</p>
        {!hasCoordinates(row) && <span className="subtle">위치 확인 중 · 지도 이동 불가</span>}
      </button>
    </li>
  );
}
