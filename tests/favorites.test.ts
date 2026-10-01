import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAVORITES_STORAGE_KEY, readFavorites, toggleFavorite } from '../features/favorites/favorites';

test('favorites persist and toggling preserves other restaurant IDs', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  assert.deepEqual(toggleFavorite(storage, 'restaurant-a'), ['restaurant-a']);
  toggleFavorite(storage, 'restaurant-b');
  assert.deepEqual(readFavorites(storage), ['restaurant-a', 'restaurant-b']);
  assert.deepEqual(toggleFavorite(storage, 'restaurant-a'), ['restaurant-b']);
  assert.equal(storage.getItem(FAVORITES_STORAGE_KEY), '["restaurant-b"]');
});

test('invalid favorite data is handled and duplicate IDs are removed', () => {
  for (const raw of ['invalid', '{}', 'null']) {
    assert.deepEqual(readFavorites({ getItem: () => raw }), []);
  }
  assert.deepEqual(readFavorites({ getItem: () => '["a","a",null,5,"", "  ","b"]' }), ['a', 'b']);
});

test('storage failures propagate so the UI can report unsuccessful saves', () => {
  const storage = { getItem: () => '[]', setItem: () => { throw new Error('Quota exceeded'); } };
  assert.throws(() => toggleFavorite(storage, 'a'), /Quota exceeded/);
  assert.throws(() => readFavorites({ getItem: () => { throw new Error('Blocked'); } }), /Blocked/);
});
