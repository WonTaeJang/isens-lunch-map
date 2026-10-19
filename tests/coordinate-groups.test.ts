import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  coordinateKey,
  favoritesFirst,
  groupByCoordinates,
} from '../features/lunch-map/coordinate-groups';
import type { MapRestaurant } from '../lib/restaurant-types';

const row = (
  id: string,
  name: string,
  latitude: string | null,
  longitude = '127',
): MapRestaurant => ({
  id,
  name,
  latitude,
  longitude,
  address: null,
  distance: null,
  category: null,
  main_menu: null,
});

test('restaurants at the same coordinates share a group sorted by name', () => {
  const groups = groupByCoordinates([
    row('a', '하나', '37.5'),
    row('b', '가나', '37.50'),
    row('c', '다른 곳', '37.5001'),
    row('d', '좌표 없음', null),
  ]);
  assert.equal(groups.size, 2);
  assert.deepEqual(
    groups.get(coordinateKey({ latitude: '37.5', longitude: '127.0' }))?.map((r) => r.id),
    ['b', 'a'],
  );
  assert.deepEqual(
    groups.get(coordinateKey({ latitude: '37.5001', longitude: '127' }))?.map((r) => r.id),
    ['c'],
  );
});

test('the list puts favorites first, both parts in name order', () => {
  const [group] = groupByCoordinates([
    row('a', '다', '37.5'),
    row('b', '나', '37.5'),
    row('c', '라', '37.5'),
    row('d', '가', '37.5'),
  ]).values();
  assert.deepEqual(
    favoritesFirst(group, new Set(['c', 'b'])).map((r) => r.name),
    ['나', '라', '가', '다'],
  );
  assert.deepEqual(
    group.map((r) => r.name),
    ['가', '나', '다', '라'],
  ); // The group itself is left as is.
});
