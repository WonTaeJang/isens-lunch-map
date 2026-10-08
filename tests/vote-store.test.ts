import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVoteStore } from '../features/reviews/vote-store';
const vote = { recommended: 1, not_recommended: 0, mine: null };

test('map and list share lookups, write locks and saved counts', async () => {
  let calls = 0;
  const store = createVoteStore((async () => {
    calls++;
    return vote;
  }) as never);
  await Promise.all([store.load('a:u', 'a', 'u'), store.load('a:u', 'a', 'u')]);
  assert.equal(calls, 1);
  assert.equal(store.begin('a:u', false), true);
  assert.equal(store.begin('a:u', true), false);
  assert.equal(store.get('a:u').pending, false);
  store.finish('a:u', { ...vote, not_recommended: 1 });
  assert.equal(store.get('a:u').pending, undefined);
  assert.equal(store.get('a:u').vote?.not_recommended, 1);
  await store.load('a:u', 'a', 'u');
  assert.equal(calls, 1);
  assert.equal(store.get('a:other').vote, null);
});

test('an older lookup cannot replace a completed write and rejected writes retain saved state', async () => {
  let resolve!: (value: unknown) => void;
  const store = createVoteStore(
    (() =>
      new Promise((done) => {
        resolve = done;
      })) as never,
  );
  const lookup = store.load('a:u', 'a', 'u');
  store.begin('a:u', true);
  store.finish('a:u', { ...vote, recommended: 2 });
  resolve(vote);
  await lookup;
  assert.equal(store.get('a:u').vote?.recommended, 2);
  store.begin('a:u', false);
  store.finish('a:u');
  assert.equal(store.get('a:u').vote?.recommended, 2);
  assert.equal(store.get('a:u').pending, undefined);
});
