import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGuideSeenStore } from '../features/guide/guide-seen-store';

test('the guide shows until it is marked seen, then stays hidden', () => {
  const data = new Map<string, string>();
  const store = createGuideSeenStore(() => ({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  }));
  let notified = 0;
  const unsubscribe = store.subscribe(() => notified++);
  assert.equal(store.isSeen(), false);
  store.markSeen();
  assert.equal(store.isSeen(), true);
  assert.equal(data.get('guide_seen'), '1');
  assert.equal(notified, 1);
  unsubscribe();
  store.markSeen();
  assert.equal(notified, 1);
});

test('blocked storage never shows the guide and marking it does not throw', () => {
  const store = createGuideSeenStore(() => {
    throw new Error('blocked');
  });
  assert.equal(store.isSeen(), true);
  assert.doesNotThrow(() => store.markSeen());
});
