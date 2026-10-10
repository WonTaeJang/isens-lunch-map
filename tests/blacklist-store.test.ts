import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBlacklistStore } from '../features/blacklist/blacklist-store';
import { hideBlockReason } from '../features/blacklist/blacklist-rules';
import type { BlacklistedRestaurant } from '../lib/blacklist/model';
import type { BlacklistApi } from '../features/blacklist/blacklist-api';

const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';

const row = (restaurant_id: string): BlacklistedRestaurant => ({
  restaurant_id,
  restaurant_name: restaurant_id,
  restaurant_category: null,
  restaurant_active: true,
  created_at: '2026-10-01T00:00:00Z',
});

function fakeApi(rows: BlacklistedRestaurant[] = []) {
  const calls = { list: 0, set: [] as [string, string, boolean][] };
  let failSet = false;
  const api: BlacklistApi = {
    list: async () => {
      calls.list++;
      return rows;
    },
    set: async (owner, id, hidden) => {
      calls.set.push([owner, id, hidden]);
      if (failSet) throw new Error('save failed');
      return {};
    },
  };
  return { api, calls, failNextSets: () => (failSet = true) };
}

test('loads for the same user share one request and publish the hidden ids', async () => {
  const { api, calls } = fakeApi([row('a'), row('b')]);
  const store = createBlacklistStore(api);
  let notified = 0;
  store.subscribe(() => notified++);
  const [first, second] = await Promise.all([store.load(user), store.load(user)]);
  assert.equal(calls.list, 1);
  assert.equal(first, second);
  assert.deepEqual(
    first.map((r) => r.restaurant_id),
    ['a', 'b'],
  );
  assert.equal(store.getSnapshot()!.owner, user);
  assert.deepEqual([...store.getSnapshot()!.ids], ['a', 'b']);
  assert.equal(notified, 1);
  await store.load(user);
  assert.equal(calls.list, 2, 'a later load asks again');
});

test('hiding and showing change the ids at once and save through the api', async () => {
  const { api, calls } = fakeApi([row('a')]);
  const store = createBlacklistStore(api);
  await store.load(user);
  const pending = store.set(user, 'b', true);
  assert.deepEqual([...store.getSnapshot()!.ids], ['a', 'b'], 'shown before saving finishes');
  await pending;
  await store.set(user, 'a', false);
  assert.deepEqual([...store.getSnapshot()!.ids], ['b']);
  assert.deepEqual(calls.set, [
    [user, 'b', true],
    [user, 'a', false],
  ]);
});

test('a failed save rolls the change back and rethrows', async () => {
  const { api, failNextSets } = fakeApi([row('a')]);
  const store = createBlacklistStore(api);
  await store.load(user);
  failNextSets();
  await assert.rejects(store.set(user, 'b', true), /save failed/);
  assert.deepEqual([...store.getSnapshot()!.ids], ['a']);
  await assert.rejects(store.set(user, 'a', false), /save failed/);
  assert.deepEqual([...store.getSnapshot()!.ids], ['a']);
});

test("another user's change does not carry over the previous user's ids", async () => {
  const { api } = fakeApi([row('a')]);
  const store = createBlacklistStore(api);
  await store.load(user);
  await store.set(other, 'z', true);
  assert.equal(store.getSnapshot()!.owner, other);
  assert.deepEqual([...store.getSnapshot()!.ids], ['z']);
});

test("today's lunch and favorites block hiding, today's lunch first", () => {
  assert.equal(hideBlockReason({ favorite: false, todayLunch: false }), null);
  assert.match(hideBlockReason({ favorite: true, todayLunch: false })!, /즐겨찾기/);
  assert.match(hideBlockReason({ favorite: false, todayLunch: true })!, /오늘의 점심/);
  assert.match(hideBlockReason({ favorite: true, todayLunch: true })!, /오늘의 점심/);
});

test('ensure loads once per user and a change made during a load survives its result', async () => {
  let release!: (rows: BlacklistedRestaurant[]) => void;
  let lists = 0;
  const store = createBlacklistStore({
    list: () => {
      lists++;
      return new Promise((resolve) => (release = resolve));
    },
    set: async () => ({}),
  });
  const loading = store.ensure(user);
  await store.set(user, 'b', true);
  await store.set(user, 'a', false);
  release([row('a'), row('c')]);
  await loading;
  assert.deepEqual([...store.getSnapshot()!.ids].sort(), ['b', 'c']);
  await store.ensure(user);
  assert.equal(lists, 1, 'already shared ids are not asked for again');
});

test('rows shown again stay in the loaded list until the page reloads', async () => {
  let rows = [row('a'), { ...row('b'), created_at: '2026-10-02T00:00:00Z' }];
  const store = createBlacklistStore({ list: async () => rows, set: async () => ({}) });
  assert.deepEqual(
    (await store.load(user)).map((r) => r.restaurant_id),
    ['b', 'a'],
  );
  await store.set(user, 'a', false);
  rows = [rows[1]];
  assert.deepEqual(
    (await store.load(user)).map((r) => r.restaurant_id),
    ['b', 'a'],
    'a reload of the tab keeps the row shown again',
  );
  assert.deepEqual([...store.getSnapshot()!.ids], ['b']);
  const fresh = await createBlacklistStore({ list: async () => rows, set: async () => ({}) }).load(
    user,
  );
  assert.deepEqual(
    fresh.map((r) => r.restaurant_id),
    ['b'],
    'a new page starts from the saved list',
  );
});
