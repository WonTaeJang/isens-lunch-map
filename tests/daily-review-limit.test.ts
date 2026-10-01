import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDailyReviewCount, recordDailyReview } from '../features/reviews/daily-review-limit';
import { DAILY_REVIEW_LIMIT, DAILY_REVIEW_STORAGE_KEY } from '../features/reviews/constants';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
const today = new Date('2026-10-01T14:59:59Z');
test('successful registrations persist up to the daily limit without a read increasing it', () => {
  const store = storage();
  assert.equal(getDailyReviewCount(store, today), 0);
  for (let i = 0; i < DAILY_REVIEW_LIMIT; i++) recordDailyReview(store, today);
  assert.equal(getDailyReviewCount(store, today), 5);
  assert.equal(getDailyReviewCount(store, today), 5);
  assert.equal(JSON.parse(store.getItem(DAILY_REVIEW_STORAGE_KEY)!).date, '2026-10-01');
});
test('the counter resets at Korean midnight, regardless of the runtime timezone', () => {
  const store = storage();
  recordDailyReview(store, today);
  const midnight = new Date('2026-10-01T15:00:00Z');
  assert.equal(getDailyReviewCount(store, midnight), 0);
  recordDailyReview(store, midnight);
  assert.deepEqual(JSON.parse(store.getItem(DAILY_REVIEW_STORAGE_KEY)!), {
    date: '2026-10-02',
    count: 1,
  });
});
test('malformed local data resets safely, while storage access errors are surfaced', () => {
  const store = storage();
  for (const value of [
    'broken',
    'null',
    '{"date":"2026-10-01","count":-1}',
    '{"date":"2026-10-01","count":"5"}',
  ]) {
    store.setItem(DAILY_REVIEW_STORAGE_KEY, value);
    assert.equal(getDailyReviewCount(store, today), 0);
  }
  assert.throws(
    () =>
      getDailyReviewCount({
        ...store,
        getItem() {
          throw new Error('denied');
        },
      }),
    /denied/,
  );
});
