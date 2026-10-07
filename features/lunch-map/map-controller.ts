import type { KakaoMaps } from './kakao-maps';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { hasCoordinates } from '@/lib/coordinates';
import { OFFICE_ADDRESS } from '@/lib/office';

// Restaurant names are shown above markers only at this zoom level or closer (1 = closest).
const NAME_LABEL_MAX_LEVEL = 2;
type MapInstance = InstanceType<KakaoMaps['Map']>;
type Overlay = InstanceType<KakaoMaps['CustomOverlay']>;
type MarkerEntry = {
  row: MapRestaurant;
  marker: InstanceType<KakaoMaps['Marker']>;
  position: object;
  onClick: () => void;
  appearance: string;
  label: Overlay | null;
};

// Owns SDK objects only. Selection and card content belong to React.
export function createMapController(
  maps: KakaoMaps,
  map: MapInstance,
  center: object,
  container: HTMLElement,
  onSelect: (id: string | null) => void,
  labelClassNames = { anchor: 'restaurant-map-label-anchor', label: 'restaurant-map-label' },
) {
  const entries = new Map<string, MarkerEntry>();
  let selectedId: string | null = null;
  let showLabels = map.getLevel() <= NAME_LABEL_MAX_LEVEL;
  // Labels are created lazily the first time they are needed, then only toggled.
  function syncLabel(entry: MarkerEntry) {
    const visible = showLabels && entry.row.id !== selectedId; // The popup already shows its name.
    if (visible && !entry.label) {
      // Kakao wraps overlay content in a box sized like the content and placed at the anchor,
      // which is exactly over the marker. A zero-size anchor keeps that box from swallowing
      // marker clicks; the visible label is positioned above it and ignores pointer events.
      const content = document.createElement('div');
      content.className = labelClassNames.anchor;
      content.setAttribute('aria-hidden', 'true'); // The marker title already names it.
      const label = document.createElement('div');
      label.className = labelClassNames.label;
      label.textContent = entry.row.name;
      content.append(label);
      entry.label = new maps.CustomOverlay({
        content,
        position: entry.position,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 1,
      });
    }
    entry.label?.setMap(visible ? map : null);
  }
  const onZoom = () => {
    const next = map.getLevel() <= NAME_LABEL_MAX_LEVEL;
    if (next === showLabels) return;
    showLabels = next;
    entries.forEach(syncLabel);
  };
  maps.event.addListener(map, 'zoom_changed', onZoom);
  const image = (file: string, selected: boolean) =>
    new maps.MarkerImage(file, new maps.Size(selected ? 32 : 18, selected ? 40 : 22.5), {
      offset: new maps.Point(selected ? 16 : 9, selected ? 38.4 : 21.6),
    });
  const images = {
    normal: image('/restaurant-marker-default.svg', false),
    favorite: image('/restaurant-marker-default-favorite.svg', false),
    reviewed: image('/restaurant-marker-reviewed.svg', false),
    reviewedFavorite: image('/restaurant-marker-reviewed-favorite.svg', false),
    selected: image('/restaurant-marker-selected.svg', true),
    selectedFavorite: image('/restaurant-marker-selected-favorite.svg', true),
  };
  const host = document.createElement('div');
  host.className = 'restaurant-map-overlay';
  const stop = (event: Event) => event.stopPropagation();
  const stopDoubleClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const blockedEvents = ['pointerdown', 'mousedown', 'touchstart', 'click'];
  blockedEvents.forEach((name) => host.addEventListener(name, stop));
  host.addEventListener('dblclick', stopDoubleClick);
  const overlay = new maps.CustomOverlay({
    content: host,
    position: center,
    xAnchor: 0.5,
    yAnchor: 1,
    zIndex: 20,
  });
  const officeMarker = new maps.Marker({
    map,
    position: center,
    title: '아이센스 빌딩',
    zIndex: 10,
    clickable: true,
    image: new maps.MarkerImage('/office-marker.svg', new maps.Size(32, 40), {
      offset: new maps.Point(16, 38.4),
    }),
  });
  // The office popup looks like the restaurant card. Restaurant cards are rendered by React;
  // this one never changes, so it is built once here.
  const officeHost = document.createElement('div');
  officeHost.className = 'restaurant-map-overlay';
  const officeCard = document.createElement('article');
  officeCard.className = 'restaurant-map-card';
  officeCard.setAttribute('aria-label', '아이센스 빌딩 상세 정보');
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'restaurant-card-close';
  closeButton.setAttribute('aria-label', '상세 정보 닫기');
  closeButton.textContent = '×';
  const officeHeader = document.createElement('div');
  officeHeader.className = 'restaurant-card-header';
  const officeTitle = document.createElement('h3');
  officeTitle.textContent = '아이센스 빌딩';
  officeHeader.append(officeTitle);
  const officeDetails = document.createElement('div');
  officeDetails.className = 'restaurant-card-details';
  const officeAddress = document.createElement('p');
  officeAddress.textContent = OFFICE_ADDRESS;
  officeDetails.append(officeAddress);
  officeCard.append(closeButton, officeHeader, officeDetails);
  officeHost.append(officeCard);
  blockedEvents.forEach((name) => officeHost.addEventListener(name, stop));
  officeHost.addEventListener('dblclick', stopDoubleClick);
  const officeOverlay = new maps.CustomOverlay({
    content: officeHost,
    position: center,
    xAnchor: 0.5,
    yAnchor: 1,
    zIndex: 20,
  });
  const close = () => {
    officeOverlay.setMap(null);
    onSelect(null);
  };
  closeButton.onclick = close;
  const closeOnEscape = (event: Event) => {
    if ((event as KeyboardEvent).key === 'Escape') close();
  };
  officeCard.addEventListener('keydown', closeOnEscape);
  const openOffice = () => {
    onSelect(null);
    overlay.setMap(null);
    officeOverlay.setMap(map);
  };
  maps.event.addListener(map, 'click', close);
  maps.event.addListener(officeMarker, 'click', openOffice);
  function remove(entry: MarkerEntry) {
    maps.event.removeListener(entry.marker, 'click', entry.onClick);
    entry.marker.setMap(null);
    entry.label?.setMap(null);
  }
  return {
    host,
    update(
      rows: MapRestaurant[],
      favorites: ReadonlySet<string>,
      nextSelectedId: string | null,
      reviewedIds?: ReadonlySet<string> | null,
    ) {
      selectedId = nextSelectedId;
      const visible = new Map(rows.filter(hasCoordinates).map((row) => [row.id, row]));
      entries.forEach((entry, id) => {
        const row = visible.get(id);
        if (
          !row ||
          row.latitude !== entry.row.latitude ||
          row.longitude !== entry.row.longitude ||
          row.name !== entry.row.name
        ) {
          remove(entry);
          entries.delete(id);
        }
      });
      visible.forEach((row) => {
        let entry = entries.get(row.id);
        if (!entry) {
          const position = new maps.LatLng(Number(row.latitude), Number(row.longitude));
          const marker = new maps.Marker({
            map,
            position,
            title: row.name,
            clickable: true,
            image: images.normal,
          });
          const onClick = () => onSelect(row.id);
          maps.event.addListener(marker, 'click', onClick);
          entry = { row, marker, position, onClick, appearance: '', label: null };
          entries.set(row.id, entry);
        }
        const selected = row.id === selectedId;
        const favorite = favorites.has(row.id);
        const appearance = selected
          ? favorite
            ? 'selectedFavorite'
            : 'selected'
          : reviewedIds?.has(row.id)
            ? favorite
              ? 'reviewedFavorite'
              : 'reviewed'
            : favorite
              ? 'favorite'
              : 'normal';
        if (entry.appearance !== appearance) {
          entry.marker.setImage(images[appearance]);
          entry.marker.setZIndex(selected ? 11 : 0);
          entry.appearance = appearance;
        }
        syncLabel(entry);
      });
      const selected = selectedId ? entries.get(selectedId) : undefined;
      if (selected) {
        officeOverlay.setMap(null);
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
    center() {
      map.setCenter(center);
    },
    dispose() {
      entries.forEach(remove);
      entries.clear();
      overlay.setMap(null);
      officeOverlay.setMap(null);
      officeMarker.setMap(null);
      maps.event.removeListener(map, 'click', close);
      maps.event.removeListener(map, 'zoom_changed', onZoom);
      maps.event.removeListener(officeMarker, 'click', openOffice);
      blockedEvents.forEach((name) => host.removeEventListener(name, stop));
      host.removeEventListener('dblclick', stopDoubleClick);
      blockedEvents.forEach((name) => officeHost.removeEventListener(name, stop));
      officeHost.removeEventListener('dblclick', stopDoubleClick);
      officeCard.removeEventListener('keydown', closeOnEscape);
      closeButton.onclick = null;
    },
  };
}

export type MapController = ReturnType<typeof createMapController>;
