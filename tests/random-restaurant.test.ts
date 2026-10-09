import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSlotNames,
  pickRestaurant,
  SLOT_LENGTH,
  WINNER_INDEX,
} from '../features/lunch-map/random-model';
import { filterRestaurants, DEFAULT_FILTERS } from '../features/lunch-map/filter-restaurants';
import type { MapRestaurant } from '../lib/restaurant-types';
import { getReviewCounts } from '../lib/reviews/model';

test('review counts distinguish unavailable data from a restaurant without reviews', () => {
  assert.equal(getReviewCounts(null, 'a'), null);
  assert.deepEqual(getReviewCounts({}, 'a'), { recommended: 0, not_recommended: 0 });
  assert.deepEqual(getReviewCounts({ a: { recommended: 3, not_recommended: 1 } }, 'a'), {
    recommended: 3,
    not_recommended: 1,
  });
});
const rows: MapRestaurant[] = ['a', 'b', 'c'].map((id, index) => ({
  id,
  name: id,
  category: '한식',
  main_menu: '',
  address: '',
  distance: index === 2 ? null : String((index + 1) * 100),
  latitude: null,
  longitude: null,
}));
test('random recommendation handles empty and singleton candidates', () => {
  assert.equal(pickRestaurant([]), null);
  assert.equal(pickRestaurant([rows[0]], 'a'), rows[0]);
});
test('random recommendation excludes only the previous result when alternatives exist', () => {
  for (let i = 0; i < 50; i++) {
    const result = pickRestaurant(rows, 'a');
    assert.ok(result && ['b', 'c'].includes(result.id));
  }
  assert.equal(pickRestaurant(rows.slice(0, 2), 'a')?.id, 'b');
});
test('distance and favorites intersect; unknown distance only participates without a distance limit', () => {
  const favorites = new Set(['b', 'c']);
  const filters = { ...DEFAULT_FILTERS, favoritesOnly: true, maxDistance: 200 };
  assert.deepEqual(
    filterRestaurants(rows, filters, favorites).map((r) => r.id),
    ['b'],
  );
  assert.deepEqual(
    filterRestaurants(rows, { ...filters, maxDistance: null }, favorites).map((r) => r.id),
    ['b', 'c'],
  );
  assert.deepEqual(filterRestaurants(rows, { ...filters, maxDistance: 100 }, favorites), []);
});

function many(count: number): MapRestaurant[] {
  return Array.from({ length: count }, (_, index) => ({
    ...rows[0],
    id: `r${index}`,
    name: `식당${index}`,
  }));
}
test('slot reel never repeats a restaurant when there are enough candidates', () => {
  for (const count of [SLOT_LENGTH, 40, 299]) {
    const candidates = many(count);
    for (let round = 0; round < 20; round++) {
      const chosen = candidates[round % count];
      const names = createSlotNames(candidates, chosen);
      assert.equal(names.length, SLOT_LENGTH);
      assert.equal(names[WINNER_INDEX], chosen.name);
      assert.equal(new Set(names).size, SLOT_LENGTH);
    }
  }
});
test('with few candidates the reel cycles them, showing the winner only where it stops', () => {
  const candidates = many(5);
  const chosen = candidates[2];
  const names = createSlotNames(candidates, chosen);
  assert.equal(names.length, SLOT_LENGTH);
  assert.deepEqual(
    names.flatMap((name, index) => (name === chosen.name ? [index] : [])),
    [WINNER_INDEX],
  );
  for (let i = 1; i < names.length; i++) assert.notEqual(names[i], names[i - 1]);
});
