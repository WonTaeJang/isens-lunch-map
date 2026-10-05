import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTodayLunchStore } from '../features/lunch-visits/today-lunch-store';
import type { LunchVisit } from '../lib/lunch-visits/model';

const user = { user_id: '11111111-1111-4111-8111-111111111111', user_name: '이름' };
const visit = (restaurant_id: string, restaurant_name: string): LunchVisit => ({
  id: 'v',
  restaurant_id,
  restaurant_name,
  restaurant_category: '한식',
  restaurant_active: true,
  visit_date: '2026-10-04',
  created_at: '2026-10-04T02:00:00.000Z',
  updated_at: null,
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function fakeApi() {
  const loads: { resolve: (value: { visit: LunchVisit | null }) => void; signal?: AbortSignal }[] =
    [];
  return {
    loads,
    api: {
      today: (_user: string, signal?: AbortSignal) =>
        new Promise<{ visit: LunchVisit | null }>((resolve) => loads.push({ resolve, signal })),
      choose: async (body: { restaurant_id: string }) => ({
        visit: visit(body.restaurant_id, `식당 ${body.restaurant_id}`),
      }),
      cancel: async () => ({ deleted: true }),
    },
  };
}

test('every consumer shares one load per user and is notified once it arrives', async () => {
  const fake = fakeApi();
  const store = createTodayLunchStore(fake.api, () => () => {});
  let notified = 0;
  store.subscribe(() => notified++);
  store.ensure(user.user_id);
  store.ensure(user.user_id); // Title and map both ask; only one request.
  assert.equal(fake.loads.length, 1);
  fake.loads[0].resolve({ visit: visit('a', '평안면옥') });
  await flush();
  assert.equal(store.getSnapshot().visit?.restaurant_name, '평안면옥');
  assert.equal(notified, 1);
  store.ensure(user.user_id);
  assert.equal(fake.loads.length, 1); // Already loaded.
});

test('returning to the page reloads once, however many consumers subscribed', async () => {
  const fake = fakeApi();
  const watchers: (() => void)[] = [];
  let stopped = 0;
  const store = createTodayLunchStore(fake.api, (onVisible) => {
    watchers.push(onVisible);
    return () => stopped++;
  });
  const unsubscribe = [1, 2, 3, 4].map(() => store.subscribe(() => {})); // title, map, list, random
  assert.equal(watchers.length, 1);
  watchers[0](); // Nothing loaded yet: no user to reload.
  assert.equal(fake.loads.length, 0);
  store.ensure(user.user_id);
  fake.loads[0].resolve({ visit: null });
  await flush();
  watchers[0]();
  assert.equal(fake.loads.length, 2);
  unsubscribe.forEach((stop) => stop());
  assert.equal(stopped, 1); // Removed only after the last consumer leaves.
});

test('choose and cancel update the shared state, and a late load cannot overwrite them', async () => {
  const fake = fakeApi();
  const store = createTodayLunchStore(fake.api, () => () => {});
  store.ensure(user.user_id);
  const saved = await store.choose(user, 'b');
  assert.equal(saved.restaurant_id, 'b');
  assert.equal(store.getSnapshot().visit?.restaurant_id, 'b');
  assert.equal(store.getSnapshot().busy, false);
  assert.equal(fake.loads[0].signal?.aborted, true);
  fake.loads[0].resolve({ visit: null }); // The stale response arrives afterwards.
  await flush();
  assert.equal(store.getSnapshot().visit?.restaurant_id, 'b');
  await store.cancel(user.user_id);
  assert.equal(store.getSnapshot().visit, null);
  assert.equal(store.getServerSnapshot().visit, null);
});

test('busy is cleared even when saving fails', async () => {
  const fake = fakeApi();
  const store = createTodayLunchStore(
    {
      ...fake.api,
      choose: async () => {
        throw new Error('지금은 오늘의 점심으로 고를 수 없는 식당이에요.');
      },
    },
    () => () => {},
  );
  await assert.rejects(store.choose(user, 'x'), /고를 수 없는/);
  assert.equal(store.getSnapshot().busy, false);
  assert.equal(store.getSnapshot().visit, null);
});
