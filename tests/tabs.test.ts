import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextTabIndex } from '../components/ui/tabs-model';

test('tab navigation wraps in both directions and supports Home/End', () => {
  assert.equal(nextTabIndex('ArrowRight', 2, 3), 0);
  assert.equal(nextTabIndex('ArrowLeft', 0, 3), 2);
  assert.equal(nextTabIndex('Home', 2, 3), 0);
  assert.equal(nextTabIndex('End', 0, 3), 2);
  assert.equal(nextTabIndex('Tab', 0, 3), null);
  assert.equal(nextTabIndex('ArrowRight', 0, 0), null);
});
