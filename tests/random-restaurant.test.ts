import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRestaurant } from '../features/lunch-map/random-model';
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
