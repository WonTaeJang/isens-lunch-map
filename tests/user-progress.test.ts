import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percent } from '../features/user/user-progress';

test('progress and recommendation ratios handle empty and complete records', () => {
  assert.equal(percent(0, 0), 0);
  assert.equal(percent(0, 299), 0);
  assert.equal(percent(299, 299), 100);
  assert.equal(percent(9, 12), 75);
  assert.equal(percent(3, 12), 25);
  assert.equal(percent(1, 299) > 0, true);
  assert.equal(percent(301, 299), 100);
});
