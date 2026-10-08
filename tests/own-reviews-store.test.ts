import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOwnReviewsStore } from '../features/reviews/own-reviews-store';

const user = '11111111-1111-4111-8111-111111111111';

test('lists on one page share a single lookup and get each restaurant choice', async () => {
  const urls: string[] = [];
  const store = createOwnReviewsStore((async (url: string) => {
    urls.push(url);
    return { restaurants: { a: true, b: false, c: null } };
  }) as never);
  let notified = 0;
  store.subscribe(() => notified++);
  await Promise.all([store.load(user), store.load(user), store.load(user)]);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /scope=reviewed-restaurants&user_id=/);
  const own = store.getSnapshot()!;
  assert.equal(own.owner, user);
  assert.deepEqual([...own.ids], ['a', 'b', 'c']);
  assert.equal(own.choices.get('a'), true);
  assert.equal(own.choices.get('b'), false);
  assert.equal(own.choices.get('c'), null);
  assert.equal(notified, 1);
  // A later load (e.g. after a review change) asks again.
  await store.load(user);
  assert.equal(urls.length, 2);
});

test('a failed lookup keeps the marks already shown', async () => {
  let fail = false;
  const store = createOwnReviewsStore((async () => {
    if (fail) throw new Error('offline');
    return { restaurants: { a: true } };
  }) as never);
  await store.load(user);
  const before = store.getSnapshot();
  fail = true;
  await store.load(user);
  assert.equal(store.getSnapshot(), before);
});

test('saved votes update subscribers immediately and survive an older in-flight lookup', async () => {
  let resolve!: (value: unknown) => void;
  const store = createOwnReviewsStore(
    (() =>
      new Promise((done) => {
        resolve = done;
      })) as never,
  );
  const loading = store.load(user);
  store.apply(user, 'a', false);
  assert.equal(store.getSnapshot()?.choices.get('a'), false);
  resolve({ restaurants: { a: true, b: true } });
  await loading;
  assert.equal(store.getSnapshot()?.choices.get('a'), false);
  assert.equal(store.getSnapshot()?.choices.get('b'), true);
  store.apply(user, 'a', undefined);
  assert.equal(store.getSnapshot()?.ids.has('a'), false);
});
