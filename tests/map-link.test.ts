import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LUNCH_MAP_ANCHOR, restaurantMapHref } from '../lib/map-link';

test('restaurantMapHref selects the restaurant and can also open its reviews', () => {
  assert.equal(restaurantMapHref('a b'), `/?restaurant=a%20b#${LUNCH_MAP_ANCHOR}`);
  assert.equal(
    restaurantMapHref('a b', { reviews: true }),
    `/?restaurant=a%20b&reviews=1#${LUNCH_MAP_ANCHOR}`,
  );
});
