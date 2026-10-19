import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMapController } from '../features/lunch-map/map-controller';
import type { KakaoMaps } from '../features/lunch-map/kakao-maps';
import type { MapRestaurant } from '../lib/restaurant-types';

const row: MapRestaurant = {
  id: 'a',
  name: '식당',
  latitude: '37.5',
  longitude: '127',
  address: '주소',
  distance: '100',
  category: '한식',
  main_menu: '국수',
};

function fixture() {
  class Element extends EventTarget {
    className = '';
    textContent = '';
    type = '';
    title = '';
    onclick: unknown;
    children: Element[] = [];
    attributes = new Map<string, string>();
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    }
    append(...children: Element[]) {
      this.children.push(...children);
    }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => new Element() },
  });
  const markers: Marker[] = [];
  const overlays: Overlay[] = [];
  const listeners = new Map<object, Map<string, () => void>>();
  class Marker {
    map: object | null;
    image: unknown;
    zIndex = 0;
    constructor(public options: { map: object; title: string; position: unknown }) {
      this.map = options.map;
      markers.push(this);
    }
    setMap(map: object | null) {
      this.map = map;
    }
    setImage(image: unknown) {
      this.image = image;
    }
    setZIndex(zIndex: number) {
      this.zIndex = zIndex;
    }
  }
  class Overlay {
    map: object | null = null;
    position: unknown;
    constructor(public options: { content: Element; position: unknown }) {
      this.position = options.position;
      overlays.push(this);
    }
    setMap(map: object | null) {
      this.map = map;
    }
    setPosition(position: unknown) {
      this.position = position;
    }
  }
  class Pair {
    constructor(
      public x: number,
      public y: number,
    ) {}
  }
  const maps = {
    LatLng: Pair,
    Size: Pair,
    Point: Pair,
    Marker,
    MarkerImage: class {
      constructor(public src: string) {}
    },
    CustomOverlay: Overlay,
    event: {
      addListener(target: object, name: string, fn: () => void) {
        if (!listeners.has(target)) listeners.set(target, new Map());
        listeners.get(target)!.set(name, fn);
      },
      removeListener(target: object, name: string) {
        listeners.get(target)?.delete(name);
      },
    },
  } as unknown as KakaoMaps;
  let moves = 0;
  let level = 4;
  let selection: string | null = null;
  let group: string | null = null;
  const map = {
    getLevel: () => level,
    setCenter() {
      moves++;
    },
    panBy() {
      moves++;
    },
    setMaxLevel() {},
    addControl() {},
  };
  const controller = createMapController(maps, map, {}, { clientHeight: 450 } as HTMLElement, {
    onSelect: (id) => {
      selection = id;
    },
    onGroup: (key) => {
      group = key;
    },
  });
  return {
    controller,
    markers,
    overlays,
    listeners,
    get moves() {
      return moves;
    },
    get selection() {
      return selection;
    },
    get group() {
      return group;
    },
    /** Simulates the user zooming the map; Kakao then fires zoom_changed. */
    zoom(next: number) {
      level = next;
      listeners.get(map)?.get('zoom_changed')?.();
    },
    map,
    restore() {
      controller.dispose();
      if (original) Object.defineProperty(globalThis, 'document', original);
      else Reflect.deleteProperty(globalThis, 'document');
    },
  };
}

test('favorite and data updates preserve marker identity, popup and map position', () => {
  const f = fixture();
  try {
    f.controller.update([row], new Set(), 'a');
    const marker = f.markers[1];
    const overlay = f.overlays[0];
    const position = overlay.position;
    f.controller.update([{ ...row }], new Set(['a']), 'a');
    assert.equal(f.markers.length, 2); // Office plus restaurant, no recreation.
    assert.equal(f.markers[1], marker);
    assert.equal(overlay.position, position);
    assert.ok(overlay.map);
    assert.match((marker.image as { src: string }).src, /selected-favorite/);
    assert.equal(f.moves, 0);
    f.controller.focus('a');
    assert.equal(f.moves, 2);
    f.controller.update([row], new Set(), 'a');
    assert.equal(f.moves, 2); // A favorite update must not replay focus.
  } finally {
    f.restore();
  }
});

test('marker clicks select without moving; filtered markers and listeners are removed', () => {
  const f = fixture();
  try {
    f.controller.update([row], new Set(), null);
    const marker = f.markers[1];
    f.listeners.get(marker)!.get('click')!();
    assert.equal(f.selection, 'a');
    assert.equal(f.moves, 0);
    f.controller.update([row], new Set(), f.selection);
    assert.equal(marker.zIndex, 11);
    f.controller.update([], new Set(), null);
    assert.equal(marker.map, null);
    assert.equal(f.overlays[0].map, null);
    assert.equal(f.listeners.get(marker)!.size, 0);
    f.controller.focus('a');
    assert.equal(f.moves, 0);
  } finally {
    f.restore();
  }
  assert.ok(f.markers.every((marker) => marker.map === null));
  assert.ok([...f.listeners.values()].every((listeners) => listeners.size === 0));
});

test('popup double-click is prevented and invalid coordinates never create markers', () => {
  const f = fixture();
  try {
    const event = new Event('dblclick', { cancelable: true, bubbles: true });
    f.controller.host.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    f.controller.update([{ ...row, latitude: null }], new Set(), 'a');
    assert.equal(f.markers.length, 1);
    assert.equal(f.overlays[0].map, null);
  } finally {
    f.restore();
  }
});

test('review markers turn green, keep favorites and selection, and revert after review removal without moving map', () => {
  const f = fixture();
  try {
    f.controller.update([row], new Set(), null, new Set([row.id]));
    const marker = f.markers.find((marker) => marker.options.title === row.name)!;
    assert.equal((marker.image as { src: string }).src, '/restaurant-marker-reviewed.svg');
    f.controller.update([row], new Set([row.id]), null, new Set([row.id]));
    assert.equal((marker.image as { src: string }).src, '/restaurant-marker-reviewed-favorite.svg');
    f.controller.update([row], new Set([row.id]), row.id, new Set([row.id]));
    assert.equal((marker.image as { src: string }).src, '/restaurant-marker-selected-favorite.svg');
    f.controller.update([row], new Set([row.id]), null, new Set());
    assert.equal((marker.image as { src: string }).src, '/restaurant-marker-default-favorite.svg');
    assert.equal(f.markers.filter((marker) => marker.options.title === row.name).length, 1);
    assert.equal(f.moves, 0);
  } finally {
    f.restore();
  }
});

test('restaurant names show above markers only at zoom levels 1-2, except the selected one', () => {
  const f = fixture();
  const other = { ...row, id: 'b', name: '다른 식당', latitude: '37.6' };
  const labels = () =>
    f.overlays
      .slice(2) // The first two overlays are the restaurant and office popups.
      .filter((overlay) => overlay.map)
      .map((overlay) => overlay.options.content.children[0].textContent);
  try {
    f.controller.update([row, other], new Set(), null);
    assert.deepEqual(labels(), []); // Starts at level 4.
    f.zoom(2);
    assert.deepEqual(labels(), ['식당', '다른 식당']);
    const created = f.overlays.length;
    f.zoom(1);
    assert.equal(f.overlays.length, created); // Zooming within 1-2 reuses labels.
    f.controller.update([row, other], new Set(), 'a');
    assert.deepEqual(labels(), ['다른 식당']); // The popup already names the selection.
    f.zoom(3);
    assert.deepEqual(labels(), []);
    f.zoom(2);
    f.controller.update([other], new Set(), null);
    assert.deepEqual(labels(), ['다른 식당']); // Filtered-out restaurants lose their label.
    assert.equal(f.overlays.length, created);
  } finally {
    f.restore();
  }
  assert.deepEqual(labels(), []);
  assert.equal(f.listeners.get(f.map)?.has('zoom_changed'), false);
});

test('labels created while zoomed in appear immediately for new restaurants', () => {
  const f = fixture();
  try {
    f.zoom(1);
    f.controller.update([row], new Set(), null);
    const label = f.overlays.at(-1)!;
    // The overlay content is a zero-size anchor so Kakao's wrapper never covers the marker.
    assert.equal(label.options.content.className, 'restaurant-map-label-anchor');
    assert.equal(label.options.content.textContent, '');
    assert.equal(label.options.content.children[0].className, 'restaurant-map-label');
    assert.equal(label.options.content.children[0].textContent, '식당');
    assert.ok(label.map);
    assert.equal(label.position, f.markers[1].options.position);
  } finally {
    f.restore();
  }
});

test('the office marker opens a card styled like the restaurant card; selecting a restaurant closes it', () => {
  const f = fixture();
  try {
    f.controller.update([row], new Set(), null);
    const office = f.overlays[1];
    const card = office.options.content.children[0];
    assert.equal(card.className, 'restaurant-map-card');
    assert.equal(card.children[1].children[0].textContent, '아이센스 빌딩');
    assert.equal(office.map, null);
    f.listeners.get(f.markers[0])!.get('click')!();
    assert.notEqual(office.map, null);
    assert.equal(f.overlays[0].map, null);
    f.controller.update([row], new Set(), 'a');
    assert.equal(office.map, null);
    assert.notEqual(f.overlays[0].map, null);
  } finally {
    f.restore();
  }
});

test('restaurants at one place share a number circle that opens the list', () => {
  const f = fixture();
  const twin = { ...row, id: 'b', name: '가게', latitude: '37.50' };
  const alone = { ...row, id: 'c', name: '혼자', latitude: '37.6' };
  const marker = (id: string) =>
    f.markers.find((m) => m.options.title === [row, twin, alone].find((r) => r.id === id)!.name)!;
  const circles = () =>
    f.overlays.filter((o) => o.options.content.className === 'restaurant-map-group');
  try {
    f.controller.update([row, twin, alone], new Set(), null);
    assert.equal(marker('a').map, null);
    assert.equal(marker('b').map, null);
    assert.ok(marker('c').map);
    assert.equal(circles().length, 1);
    const circle = circles()[0];
    const button = circle.options.content;
    assert.ok(circle.map);
    assert.equal(button.textContent, '2');
    assert.equal(button.attributes.get('aria-label'), '여기 모인 식당 2곳 목록 보기');
    assert.equal(button.title, '가게 외 1곳'); // The first name in Korean order.

    button.dispatchEvent(new Event('click'));
    assert.equal(f.selection, null);
    assert.equal(f.group, '37.5000000,127.0000000');
    assert.equal(f.moves, 0);
    f.controller.update([row, twin, alone], new Set(), null, null, f.group);
    assert.equal(button.attributes.get('aria-expanded'), 'true');
    assert.ok(f.overlays[0].map); // The list card sits on the circle.
    assert.equal(f.overlays[0].position, circle.position);

    // Picking from the list (or the lunch list, or a game) shows the usual selected marker.
    f.controller.update([row, twin, alone], new Set(['a']), 'a', null, null);
    assert.ok(marker('a').map);
    assert.match((marker('a').image as { src: string }).src, /selected-favorite/);
    assert.equal(marker('b').map, null);
    assert.equal(circle.map, null);
    assert.equal(f.overlays[0].position, marker('a').options.position);

    f.controller.update([row, twin, alone], new Set(), null);
    assert.equal(marker('a').map, null);
    assert.ok(circle.map);
    assert.equal(f.overlays[0].map, null);

    // Only visible restaurants count; a lone one gets its marker back.
    f.controller.update([row, alone], new Set(), null);
    assert.equal(circle.map, null);
    assert.equal(circles().length, 1);
    assert.ok(marker('a').map);
  } finally {
    f.restore();
  }
  assert.ok(f.overlays.every((overlay) => overlay.map === null));
});

test('a number circle is labeled with the first name when zoomed in', () => {
  const f = fixture();
  const twin = { ...row, id: 'b', name: '가게' };
  const labels = () =>
    f.overlays
      .filter((o) => o.map && o.options.content.className === 'restaurant-map-label-anchor')
      .map((o) => {
        const label = o.options.content.children[0];
        const parts = label.children.map((part) => part.textContent);
        return [label.className, parts.length ? parts.join(' ') : label.textContent];
      });
  try {
    f.zoom(2);
    f.controller.update([row, twin], new Set(), null);
    assert.deepEqual(labels(), [['restaurant-map-label restaurant-map-group-label', '가게 외 1']]);
    f.controller.update([row, twin], new Set(), null, null, '37.5000000,127.0000000');
    assert.deepEqual(labels(), []); // The list card already covers it.
    f.controller.update([row, twin], new Set(), 'b');
    assert.deepEqual(labels(), []);
    f.controller.update([row], new Set(), null);
    assert.deepEqual(labels(), [['restaurant-map-label', '식당']]);
  } finally {
    f.restore();
  }
});
