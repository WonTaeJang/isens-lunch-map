import type { KakaoMaps } from './kakao-maps';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { OFFICE_ADDRESS } from '@/lib/office';
import { coordinateKey, groupByCoordinates } from './coordinate-groups';

// Restaurant names are shown above markers only at this zoom level or closer (1 = closest).
const NAME_LABEL_MAX_LEVEL = 2;
type MapInstance = InstanceType<KakaoMaps['Map']>;
type Overlay = InstanceType<KakaoMaps['CustomOverlay']>;
type Labeled = {
  position: object;
  label: Overlay | null;
  labelText: HTMLElement | null;
  /** "외 N" after a group's name, kept visible when the name is cut short. */
  labelSuffix?: HTMLElement;
};
type MarkerEntry = Labeled & {
  row: MapRestaurant;
  marker: InstanceType<KakaoMaps['Marker']>;
  onClick: () => void;
  appearance: string;
  /** False while a number circle stands in for it (it shares its place and is not selected). */
  shown: boolean;
};
/** A number circle for restaurants at the same coordinates. */
type GroupEntry = Labeled & {
  key: string;
  rows: MapRestaurant[];
  overlay: Overlay;
  button: HTMLButtonElement;
  onClick: () => void;
  /** False while one of its restaurants is selected and shows its own marker instead. */
  shown: boolean;
};

const CLASS_NAMES = {
  labelAnchor: 'restaurant-map-label-anchor',
  label: 'restaurant-map-label',
  group: 'restaurant-map-group',
  /** Added to a number circle once the viewer reviewed every restaurant in it. */
  groupReviewed: 'restaurant-map-group-reviewed',
  groupLabel: 'restaurant-map-group-label',
  overlay: 'restaurant-map-overlay',
  card: 'restaurant-map-card',
  close: 'restaurant-card-close',
  header: 'restaurant-card-header',
  details: 'restaurant-card-details',
};

type Options = {
  onSelect: (id: string | null) => void;
  /** Opens the list of restaurants at one place (its key), or closes it (null). */
  onGroup?: (key: string | null) => void;
  classNames?: Partial<typeof CLASS_NAMES>;
};

// Owns SDK objects only. Selection and card content belong to React.
export function createMapController(
  maps: KakaoMaps,
  map: MapInstance,
  center: object,
  container: HTMLElement,
  { onSelect, onGroup = () => {}, classNames }: Options,
) {
  const names = { ...CLASS_NAMES, ...classNames };
  const entries = new Map<string, MarkerEntry>();
  const groups = new Map<string, GroupEntry>();
  let selectedId: string | null = null;
  let openGroup: string | null = null;
  let showLabels = map.getLevel() <= NAME_LABEL_MAX_LEVEL;
  // Labels are created lazily the first time they are needed, then only toggled.
  function setLabel(target: Labeled, text: string | null, className: string, suffix?: string) {
    if (text !== null && !target.label) {
      // Kakao wraps overlay content in a box sized like the content and placed at the anchor,
      // which is exactly over the marker. A zero-size anchor keeps that box from swallowing
      // marker clicks; the visible label is positioned above it and ignores pointer events.
      const content = document.createElement('div');
      content.className = names.labelAnchor;
      content.setAttribute('aria-hidden', 'true'); // The marker title already names it.
      const label = document.createElement('div');
      label.className = className;
      content.append(label);
      target.labelText = label;
      if (suffix !== undefined) {
        target.labelText = document.createElement('span');
        target.labelSuffix = document.createElement('span');
        label.append(target.labelText, target.labelSuffix);
      }
      target.label = new maps.CustomOverlay({
        content,
        position: target.position,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 1,
      });
    }
    if (text !== null && target.labelText) target.labelText.textContent = text;
    if (text !== null && target.labelSuffix) target.labelSuffix.textContent = suffix ?? '';
    target.label?.setMap(text !== null ? map : null);
  }
  function syncLabels() {
    entries.forEach((entry) => {
      // The popup already shows the selected name.
      const visible = showLabels && entry.shown && entry.row.id !== selectedId;
      setLabel(entry, visible ? entry.row.name : null, names.label);
    });
    groups.forEach((group) => {
      const visible = showLabels && group.shown && group.key !== openGroup;
      setLabel(
        group,
        visible ? group.rows[0].name : null,
        `${names.label} ${names.groupLabel}`,
        `외 ${group.rows.length - 1}`,
      );
    });
  }
  const onZoom = () => {
    const next = map.getLevel() <= NAME_LABEL_MAX_LEVEL;
    if (next === showLabels) return;
    showLabels = next;
    syncLabels();
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
  host.className = names.overlay;
  const stop = (event: Event) => event.stopPropagation();
  const stopDoubleClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  // wheel scrolls the card's own lists instead of zooming the map.
  const blockedEvents = ['pointerdown', 'mousedown', 'touchstart', 'click', 'wheel'];
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
  officeHost.className = names.overlay;
  const officeCard = document.createElement('article');
  officeCard.className = names.card;
  officeCard.setAttribute('aria-label', '아이센스 빌딩 상세 정보');
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = names.close;
  closeButton.setAttribute('aria-label', '상세 정보 닫기');
  closeButton.textContent = '×';
  const officeHeader = document.createElement('div');
  officeHeader.className = names.header;
  const officeTitle = document.createElement('h3');
  officeTitle.textContent = '아이센스 빌딩';
  officeHeader.append(officeTitle);
  const officeDetails = document.createElement('div');
  officeDetails.className = names.details;
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
    onGroup(null);
  };
  closeButton.onclick = close;
  const closeOnEscape = (event: Event) => {
    if ((event as KeyboardEvent).key === 'Escape') close();
  };
  officeCard.addEventListener('keydown', closeOnEscape);
  const openOffice = () => {
    onSelect(null);
    onGroup(null);
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
  function createGroup(key: string, rows: MapRestaurant[]): GroupEntry {
    const position = new maps.LatLng(Number(rows[0].latitude), Number(rows[0].longitude));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = names.group;
    const onClick = () => {
      officeOverlay.setMap(null);
      onSelect(null);
      onGroup(key);
    };
    button.addEventListener('click', onClick);
    button.addEventListener('dblclick', stopDoubleClick);
    // clickable keeps clicks on the circle from reaching the map, which would close the list.
    const groupOverlay = new maps.CustomOverlay({
      content: button,
      position,
      xAnchor: 0.5,
      yAnchor: 1,
      zIndex: 1,
      clickable: true,
    });
    return {
      key,
      rows,
      position,
      overlay: groupOverlay,
      button,
      onClick,
      label: null,
      labelText: null,
      shown: false,
    };
  }
  function removeGroup(group: GroupEntry) {
    group.button.removeEventListener('click', group.onClick);
    group.button.removeEventListener('dblclick', stopDoubleClick);
    group.overlay.setMap(null);
    group.label?.setMap(null);
  }
  return {
    host,
    update(
      rows: MapRestaurant[],
      favorites: ReadonlySet<string>,
      nextSelectedId: string | null,
      reviewedIds?: ReadonlySet<string> | null,
      nextOpenGroup: string | null = null,
    ) {
      selectedId = nextSelectedId;
      openGroup = nextOpenGroup;
      const places = groupByCoordinates(rows);
      const visible = new Map([...places.values()].flat().map((row) => [row.id, row]));
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
          entry = {
            row,
            marker,
            position,
            onClick,
            appearance: '',
            label: null,
            labelText: null,
            shown: true,
          };
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
        // A restaurant in a group shows its own marker only while selected.
        const shown = places.get(coordinateKey(row))!.length === 1 || selected;
        if (entry.shown !== shown) {
          entry.marker.setMap(shown ? map : null);
          entry.shown = shown;
        }
      });
      groups.forEach((group, key) => {
        if ((places.get(key)?.length ?? 0) < 2) {
          removeGroup(group);
          groups.delete(key);
        }
      });
      places.forEach((rowsHere, key) => {
        if (rowsHere.length < 2) return;
        let group = groups.get(key);
        if (!group) {
          group = createGroup(key, rowsHere);
          groups.set(key, group);
        }
        group.rows = rowsHere;
        group.button.textContent = String(rowsHere.length);
        group.button.title = `${rowsHere[0].name} 외 ${rowsHere.length - 1}곳`;
        // All reviewed: the circle takes the reviewed marker's color, like a single marker would.
        const allReviewed = rowsHere.every((row) => reviewedIds?.has(row.id));
        group.button.className = allReviewed
          ? `${names.group} ${names.groupReviewed}`
          : names.group;
        group.button.setAttribute(
          'aria-label',
          `여기 모인 식당 ${rowsHere.length}곳 목록 보기${allReviewed ? ', 모두 내 리뷰 작성됨' : ''}`,
        );
        group.button.setAttribute('aria-expanded', String(key === openGroup));
        const shown = !rowsHere.some((row) => row.id === selectedId);
        if (group.shown !== shown) {
          group.overlay.setMap(shown ? map : null);
          group.shown = shown;
        }
      });
      syncLabels();
      const selected = selectedId ? entries.get(selectedId) : undefined;
      const open = selected ? undefined : openGroup ? groups.get(openGroup) : undefined;
      const anchor = selected ?? open;
      if (anchor) {
        officeOverlay.setMap(null);
        overlay.setPosition(anchor.position);
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
    resize() {
      const currentCenter = map.getCenter();
      map.relayout();
      map.setCenter(currentCenter);
    },
    dispose() {
      entries.forEach(remove);
      entries.clear();
      groups.forEach(removeGroup);
      groups.clear();
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
