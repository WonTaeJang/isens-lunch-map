import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalUserStore, type LocalIdentity } from '../features/local-user/local-user-store';

test('identity initialization is shared and stale loads cannot overwrite storage changes', async () => {
  const pending: ((user: LocalIdentity) => void)[] = [];
  const store = createLocalUserStore(() => new Promise((resolve) => pending.push(resolve)));
  const first = store.initialize();
  assert.equal(store.initialize(), first);
  const changed = store.initialize(true);
  const latest = { user_id: 'new', user_name: '새 사용자' };
  pending[1](latest);
  await changed;
  pending[0]({ user_id: 'old', user_name: '이전 사용자' });
  await first;
  assert.deepEqual(store.getSnapshot().identity, latest);
});
test('blocked identity storage becomes a shared read-only error state', async () => {
  const store = createLocalUserStore(async () => {
    throw new Error('Blocked');
  });
  await store.initialize();
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(store.getSnapshot().identity, null);
  assert.ok(store.getSnapshot().error);
});
