import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boxPosition,
  countBoxColors,
  createBoxes,
  getBoxCandidates,
  pickBoxColor,
  type BoxHistoryEntry,
} from '../features/lunch-box/model';
import { DEFAULT_FILTERS } from '../features/lunch-map/filter-restaurants';
import type { MapRestaurant } from '../lib/restaurant-types';

const rows: MapRestaurant[] = [
  { id: 'a', category: '한식', distance: '80' },
  { id: 'b', category: '일식', distance: '200' },
  { id: 'c', category: null, distance: '50' },
  { id: 'd', category: '한식', distance: null },
].map((row) => ({
  name: row.id,
  main_menu: null,
  address: null,
  latitude: null,
  longitude: null,
  ...row,
}));

test('box candidates intersect inherited distance/favorites and game categories', () => {
  const filters = {
    ...DEFAULT_FILTERS,
    maxDistance: 100,
    favoritesOnly: true,
    query: 'ignored search',
  };
  const favorites = new Set(['a', 'b', 'c', 'd']);
  assert.deepEqual(
    getBoxCandidates(rows, filters, favorites).map((row) => row.id),
    ['a', 'c'],
  );
  assert.deepEqual(
    getBoxCandidates(rows, filters, favorites, ['미분류']).map((row) => row.id),
    ['c'],
  );
  assert.deepEqual(getBoxCandidates(rows, filters, favorites, ['일식']), []);
  assert.equal(getBoxCandidates(rows, DEFAULT_FILTERS, favorites).length, 4);
});

test('boxes respect candidate boundaries, avoid duplicates and exclude the previous winner', () => {
  const candidates = getBoxCandidates(rows, { ...DEFAULT_FILTERS, maxDistance: 100 }, new Set());
  assert.deepEqual(
    createBoxes(candidates, 'a', () => 0).map((box) => box.restaurant.id),
    ['c'],
  );
  assert.equal(createBoxes([rows[0]], 'a', () => 0)[0].restaurant.id, 'a');
  assert.deepEqual(createBoxes([]), []);
  const boxes = createBoxes(rows, undefined, () => 0);
  assert.equal(boxes.length, 3);
  assert.equal(new Set(boxes.map((box) => box.restaurant.id)).size, 3);
  assert.equal(rows.length, 4);
});

test('effect colors use independent draws and preserve probability boundaries', () => {
  assert.deepEqual([0, 0.5999, 0.6, 0.8999, 0.9, 0.9899, 0.99, 0.9999].map(pickBoxColor), [
    'blue',
    'blue',
    'purple',
    'purple',
    'gold',
    'gold',
    'rainbow',
    'rainbow',
  ]);
  const draw = (color: number) => {
    let calls = 0;
    return createBoxes(rows, undefined, () => (++calls <= 3 ? 0 : color));
  };
  assert.deepEqual(
    draw(0).map((box) => box.restaurant),
    draw(0.99).map((box) => box.restaurant),
  );
  assert.ok(draw(0.99).every((box) => box.color === 'rainbow'));
});

test('effect distribution is blue 60%, purple 30%, gold 9%, rainbow 1%', () => {
  const counts = { blue: 0, purple: 0, gold: 0, rainbow: 0 };
  for (let i = 0; i < 10000; i++) counts[pickBoxColor((i + 0.5) / 10000)]++;
  assert.deepEqual(counts, { blue: 6000, purple: 3000, gold: 900, rainbow: 100 });
});

test('history counts every draw even when the same restaurant repeats', () => {
  assert.deepEqual(countBoxColors([]), { blue: 0, purple: 0, gold: 0, rainbow: 0 });
  const entries: BoxHistoryEntry[] = ['blue', 'gold', 'blue', 'rainbow'].map((color, index) => ({
    id: String(index),
    restaurant: rows[0],
    color: color as BoxHistoryEntry['color'],
    position: '가운데',
    counts: null,
  }));
  assert.deepEqual(countBoxColors(entries), { blue: 2, purple: 0, gold: 1, rainbow: 1 });
  assert.equal(entries.length, 4);
});

test('history position follows the displayed layout for one, two and three boxes', () => {
  assert.equal(boxPosition(0, 1), '가운데');
  assert.deepEqual(
    [0, 1].map((i) => boxPosition(i, 2)),
    ['왼쪽', '오른쪽'],
  );
  assert.deepEqual(
    [0, 1, 2].map((i) => boxPosition(i, 3)),
    ['왼쪽', '가운데', '오른쪽'],
  );
});
