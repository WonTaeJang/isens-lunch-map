import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRADE_STORAGE_KEY,
  parseStoredTier,
  promoteStoredTier,
} from '../features/grade/grade-store';

const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    values,
  };
}

test('the stored grade belongs to one user and must be a known tier', () => {
  const raw = JSON.stringify({ user_id: user, tier: 'gold' });
  assert.equal(parseStoredTier(raw, user), 'gold');
  assert.equal(parseStoredTier(raw, user.toUpperCase()), 'gold');
  assert.equal(parseStoredTier(raw, other), null, "another identity's grade is ignored");
  assert.equal(parseStoredTier(JSON.stringify({ user_id: user, tier: 'wood' }), user), null);
  assert.equal(parseStoredTier('not json', user), null);
  assert.equal(parseStoredTier(null, user), null);
});

test('a first grade is stored quietly, a higher one is a promotion', () => {
  const storage = memory();
  assert.deepEqual(promoteStoredTier(storage, user, 'silver'), {
    tier: 'silver',
    promotedFrom: null,
  });
  assert.equal(parseStoredTier(storage.getItem(GRADE_STORAGE_KEY), user), 'silver');
  assert.deepEqual(promoteStoredTier(storage, user, 'gold'), {
    tier: 'gold',
    promotedFrom: 'silver',
  });
  assert.equal(parseStoredTier(storage.getItem(GRADE_STORAGE_KEY), user), 'gold');
});

test('the grade never goes down, and another user starts over', () => {
  const storage = memory({ [GRADE_STORAGE_KEY]: JSON.stringify({ user_id: user, tier: 'gold' }) });
  assert.deepEqual(promoteStoredTier(storage, user, 'bronze'), {
    tier: 'gold',
    promotedFrom: null,
  });
  assert.deepEqual(promoteStoredTier(storage, user, 'gold'), { tier: 'gold', promotedFrom: null });
  assert.deepEqual(promoteStoredTier(storage, other, 'bronze'), {
    tier: 'bronze',
    promotedFrom: null,
  });
  assert.equal(parseStoredTier(storage.getItem(GRADE_STORAGE_KEY), other), 'bronze');
});
