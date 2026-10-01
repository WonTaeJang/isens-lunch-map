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
    onclick: unknown;
    setAttribute() {}
    append() {}
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
    constructor(public options: { map: object; title: string }) {
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
    constructor() {
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
    InfoWindow: class {
      open() {}
      close() {}
    },
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
  let selection: string | null = null;
  const map = {
    setCenter() {
      moves++;
    },
    panBy() {
      moves++;
    },
    setMaxLevel() {},
    addControl() {},
  };
  const controller = createMapController(
    maps,
    map,
    {},
    { clientHeight: 450 } as HTMLElement,
    (id) => {
      selection = id;
    },
  );
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
