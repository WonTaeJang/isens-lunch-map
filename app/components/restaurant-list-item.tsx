'use client';
import { formatDistance } from '@/lib/distance';
import { hasCoordinates } from '@/lib/coordinates';
import type { MapRestaurant } from '@/lib/restaurant-types';
export default function RestaurantListItem({row, selected, onSelect}: {row: MapRestaurant; selected: boolean; onSelect: () => void}) {
  return (<li><button type="button" className="restaurant-select" disabled={!hasCoordinates(row)} aria-label={`${row.name} 지도에서 보기`} aria-pressed={selected} onClick={onSelect}><div className="restaurant-title"><h3>{row.name}</h3><span className="distance-badge">{formatDistance(row.distance)}</span></div><p className="description">{row.category} · {row.main_menu}</p><p className="description">{row.address || '주소 확인 필요'}</p>{!hasCoordinates(row) && <span className="subtle">위치 확인 중 · 지도 이동 불가</span>}</button></li>);
}
