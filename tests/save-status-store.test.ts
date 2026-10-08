import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSaveStatusStore } from '../components/ui/save-status-store';

test('concurrent saves stay busy until all finish and clear the success icon', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const store = createSaveStatusStore();
  const first = store.begin();
  const second = store.begin();
  first(true);
  first(true);
  assert.equal(store.getSnapshot(), 'saving');
  second(true);
  assert.equal(store.getSnapshot(), 'saved');
  t.mock.timers.tick(1200);
  assert.equal(store.getSnapshot(), null);
});

test('an earlier success timer cannot hide a new save; failed batches show no success', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const store = createSaveStatusStore();
  store.begin()(true);
  const finish = store.begin();
  const other = store.begin();
  t.mock.timers.tick(1200);
  assert.equal(store.getSnapshot(), 'saving');
  finish(false);
  other(true);
  assert.equal(store.getSnapshot(), null);
});
