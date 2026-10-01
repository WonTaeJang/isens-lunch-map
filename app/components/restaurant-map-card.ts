import type { MapRestaurant } from '@/lib/restaurant-types';
import { formatDistance } from '@/lib/distance';

function textElement(tag: string, text: string, className = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

export function createRestaurantMapCard(restaurant: MapRestaurant, onClose: () => void, onFavorite: () => void) {
  const content = document.createElement('article');
  content.className = 'restaurant-map-card';
  content.setAttribute('aria-label', `${restaurant.name} 상세 정보`);
  // Keep card controls from starting the map's drag gesture.
  content.addEventListener('pointerdown', event => event.stopPropagation());
  content.addEventListener('mousedown', event => event.stopPropagation());
  content.addEventListener('touchstart', event => event.stopPropagation(), { passive: true });
  content.addEventListener('click', event => event.stopPropagation());
  content.addEventListener('dblclick', event => {
    event.preventDefault();
    event.stopPropagation();
  });

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'restaurant-card-close';
  close.setAttribute('aria-label', '상세 정보 닫기');
  close.textContent = '×';
  close.onclick = onClose;

  const header = document.createElement('div');
  header.className = 'restaurant-card-header';
  header.append(textElement('h3', restaurant.name));
  const meta = textElement('p', restaurant.category || '분류 정보 없음', 'restaurant-card-meta');
  meta.append(textElement('span', formatDistance(restaurant.distance), 'distance-badge'));
  const details = document.createElement('div');
  details.className = 'restaurant-card-details';
  details.append(
    textElement('p', restaurant.address || '주소 확인 필요'),
    textElement('p', `대표메뉴 · ${restaurant.main_menu || '정보 없음'}`, 'restaurant-card-menu'),
  );

  const actions = document.createElement('div');
  actions.className = 'restaurant-card-actions';
  const favorite = document.createElement('button');
  favorite.type = 'button';
  favorite.className = 'restaurant-card-favorite';
  // Only a static icon is HTML; restaurant data is always assigned with textContent.
  favorite.innerHTML = '<svg width="18" height="20" viewBox="0 0 18 22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 2h12v18l-6-4-6 4z"/></svg>';
  const favoriteLabel = textElement('span', '즐겨찾기');
  favorite.append(favoriteLabel);
  favorite.onclick = onFavorite;
  const directions = document.createElement('a');
  directions.className = 'restaurant-card-directions';
  directions.textContent = '길찾기 ↗';
  directions.href = `https://map.kakao.com/link/to/${encodeURIComponent(restaurant.name)},${Number(restaurant.latitude)},${Number(restaurant.longitude)}`;
  directions.target = '_blank';
  directions.rel = 'noopener noreferrer';
  actions.append(favorite, directions);
  const status = textElement('p', '', 'restaurant-card-status');
  status.setAttribute('role', 'status');
  content.append(close, header, meta, details, actions, status);
  content.addEventListener('keydown', event => { if (event.key === 'Escape') onClose(); });

  return {
    content,
    setFavorite(saved: boolean) {
      favorite.setAttribute('aria-pressed', String(saved));
      favorite.setAttribute('aria-label', `${restaurant.name} 즐겨찾기 ${saved ? '해제' : '추가'}`);
      favoriteLabel.textContent = saved ? '저장됨' : '즐겨찾기';
    },
    showMessage(message: string) { status.textContent = message; },
  };
}
