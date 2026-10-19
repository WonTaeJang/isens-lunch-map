import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readRecent,
  RECENT_LIMIT,
  RECENT_STORAGE_KEY,
  withRecent,
} from '../features/recent-restaurants/recent-restaurants-store';

const storage = (raw: string | null) => ({
  getItem: (key: string) => (key === RECENT_STORAGE_KEY ? raw : null),
});

test('recent restaurants keep the newest first, without duplicates, at most five', () => {
  assert.equal(RECENT_LIMIT, 5);
  assert.deepEqual(withRecent(['a', 'b'], 'c'), ['c', 'a', 'b']);
  assert.deepEqual(withRecent(['a', 'b', 'c'], 'b'), ['b', 'a', 'c']);
  assert.deepEqual(withRecent(['a', 'b', 'c', 'd', 'e'], 'f'), ['f', 'a', 'b', 'c', 'd']);
});

test('stored recent ids are read defensively', () => {
  assert.deepEqual(readRecent(storage(null)), []);
  assert.deepEqual(readRecent(storage('not json')), []);
  assert.deepEqual(readRecent(storage('{"a":1}')), []);
  assert.deepEqual(readRecent(storage('["a", 3, "", "a", "b", "c", "d", "e", "f"]')), [
    'a',
    'b',
    'c',
    'd',
    'e',
  ]);
});
