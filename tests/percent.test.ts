import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPercent, percent } from '../lib/percent';

test('progress and recommendation ratios handle empty and complete records', () => {
  assert.equal(percent(0, 0), 0);
  assert.equal(percent(0, 299), 0);
  assert.equal(percent(299, 299), 100);
  assert.equal(percent(9, 12), 75);
  assert.equal(percent(3, 12), 25);
  assert.equal(percent(1, 299) > 0, true);
  assert.equal(percent(301, 299), 100);
});

test('percentages show up to one decimal without a trailing zero', () => {
  assert.equal(formatPercent(percent(7, 299)), '2.3%');
  assert.equal(formatPercent(25), '25%');
  assert.equal(formatPercent(0), '0%');
  assert.equal(formatPercent(100), '100%');
});
