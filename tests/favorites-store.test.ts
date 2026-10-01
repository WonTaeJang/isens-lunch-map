import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFavoritesSnapshot, subscribeFavorites, toggleStoredFavorite } from '../features/favorites/favorites-store';
import { FAVORITES_STORAGE_KEY } from '../features/favorites/favorites';

test('favorite store notifies after successful writes, syncs tabs and cleans up listeners', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const values = new Map<string, string>();
  let blocked = false;
  const target = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { if (blocked) throw new Error('Blocked'); values.set(key, value); },
    },
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target });
  let calls = 0;
  const unsubscribe = subscribeFavorites(() => { calls++; });
  try {
    assert.equal(toggleStoredFavorite('a'), null);
    assert.equal(getFavoritesSnapshot(), '["a"]');
    assert.equal(calls, 1);
    blocked = true;
    assert.ok(toggleStoredFavorite('a'));
    assert.equal(getFavoritesSnapshot(), '["a"]');
    assert.equal(calls, 1);
    target.dispatchEvent(Object.assign(new Event('storage'), { key: 'unrelated' }));
    assert.equal(calls, 1);
    target.dispatchEvent(Object.assign(new Event('storage'), { key: FAVORITES_STORAGE_KEY }));
    assert.equal(calls, 2);
    target.dispatchEvent(Object.assign(new Event('storage'), { key: null }));
    assert.equal(calls, 3);
    unsubscribe();
    blocked = false;
    toggleStoredFavorite('a');
    assert.equal(calls, 3);
  } finally {
    unsubscribe();
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
