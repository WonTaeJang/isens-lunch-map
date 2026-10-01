import type { KakaoMaps } from './kakao-maps';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { hasCoordinates } from '@/lib/coordinates';

export const OFFICE_ADDRESS = '서울 서초구 반포대로28길 43';
type MapInstance = InstanceType<KakaoMaps['Map']>;
type MarkerEntry = {
  row: MapRestaurant;
  marker: InstanceType<KakaoMaps['Marker']>;
  position: object;
  onClick: () => void;
  appearance: string;
};

// Owns SDK objects only. Selection and card content belong to React.
export function createMapController(
  maps: KakaoMaps,
  map: MapInstance,
  center: object,
  container: HTMLElement,
  onSelect: (id: string | null) => void,
) {
  const entries = new Map<string, MarkerEntry>();
  const image = (file: string, selected: boolean) => new maps.MarkerImage(
    file, new maps.Size(selected ? 40 : 24, selected ? 50 : 30),
    { offset: new maps.Point(selected ? 20 : 12, selected ? 48 : 28.8) },
  );
  const images = {
    normal: image('/restaurant-marker-default.svg', false),
    favorite: image('/restaurant-marker-default-favorite.svg', false),
    selected: image('/restaurant-marker-selected.svg', true),
    selectedFavorite: image('/restaurant-marker-selected-favorite.svg', true),
  };
  const host = document.createElement('div');
  host.className = 'restaurant-map-overlay';
  const stop = (event: Event) => event.stopPropagation();
  const stopDoubleClick = (event: Event) => { event.preventDefault(); event.stopPropagation(); };
  const blockedEvents = ['pointerdown', 'mousedown', 'touchstart', 'click'];
  blockedEvents.forEach(name => host.addEventListener(name, stop));
  host.addEventListener('dblclick', stopDoubleClick);
  const overlay = new maps.CustomOverlay({ content: host, position: center, xAnchor: 0.5, yAnchor: 1, zIndex: 20 });
  const officeMarker = new maps.Marker({
    map, position: center, title: '아이센스 빌딩', zIndex: 10, clickable: true,
    image: new maps.MarkerImage('/office-marker.svg', new maps.Size(40, 50), { offset: new maps.Point(20, 48) }),
  });
  const officeContent = document.createElement('div');
  officeContent.className = 'map-office-info';
  officeContent.textContent = '아이센스 빌딩';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'map-info-close';
  closeButton.setAttribute('aria-label', '상세 정보 닫기');
  closeButton.textContent = '×';
  officeContent.append(closeButton);
  const officeInfo = new maps.InfoWindow({ content: officeContent, removable: false, zIndex: 20 });
  const close = () => { officeInfo.close(); onSelect(null); };
  closeButton.onclick = close;
  const openOffice = () => { onSelect(null); overlay.setMap(null); officeInfo.open(map, officeMarker); };
  maps.event.addListener(map, 'click', close);
  maps.event.addListener(officeMarker, 'click', openOffice);
  function remove(entry: MarkerEntry) {
    maps.event.removeListener(entry.marker, 'click', entry.onClick);
    entry.marker.setMap(null);
  }
  return {
    host,
    update(rows: MapRestaurant[], favorites: ReadonlySet<string>, selectedId: string | null) {
      const visible = new Map(rows.filter(hasCoordinates).map(row => [row.id, row]));
      entries.forEach((entry, id) => {
        const row = visible.get(id);
        if (!row || row.latitude !== entry.row.latitude || row.longitude !== entry.row.longitude || row.name !== entry.row.name) {
          remove(entry);
          entries.delete(id);
        }
      });
      visible.forEach(row => {
        let entry = entries.get(row.id);
        if (!entry) {
          const position = new maps.LatLng(Number(row.latitude), Number(row.longitude));
          const marker = new maps.Marker({ map, position, title: row.name, clickable: true, image: images.normal });
          const onClick = () => onSelect(row.id);
          maps.event.addListener(marker, 'click', onClick);
          entry = { row, marker, position, onClick, appearance: '' };
          entries.set(row.id, entry);
        }
        const selected = row.id === selectedId;
        const appearance = selected ? (favorites.has(row.id) ? 'selectedFavorite' : 'selected') : (favorites.has(row.id) ? 'favorite' : 'normal');
        if (entry.appearance !== appearance) {
          entry.marker.setImage(images[appearance]);
          entry.marker.setZIndex(selected ? 11 : 0);
          entry.appearance = appearance;
        }
      });
      const selected = selectedId ? entries.get(selectedId) : undefined;
      if (selected) {
        officeInfo.close();
        overlay.setPosition(selected.position);
        overlay.setMap(map);
      } else overlay.setMap(null);
    },
    focus(id: string) {
      const entry = entries.get(id);
      if (!entry) return;
      map.setCenter(entry.position);
      map.panBy(0, -Math.max(0, 310 - container.clientHeight / 2));
    },
    center() { map.setCenter(center); },
    dispose() {
      entries.forEach(remove);
      entries.clear();
      overlay.setMap(null);
      officeInfo.close();
      officeMarker.setMap(null);
      maps.event.removeListener(map, 'click', close);
      maps.event.removeListener(officeMarker, 'click', openOffice);
      blockedEvents.forEach(name => host.removeEventListener(name, stop));
      host.removeEventListener('dblclick', stopDoubleClick);
      closeButton.onclick = null;
    },
  };
}

export type MapController = ReturnType<typeof createMapController>;
