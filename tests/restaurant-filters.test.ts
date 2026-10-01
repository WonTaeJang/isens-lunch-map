import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_FILTERS, filterRestaurants } from '../features/lunch-map/filter-restaurants';
import type { MapRestaurant } from '../lib/restaurant-types';

const rows: MapRestaurant[] = [
  { id: 'a', name: '맛있는 국수', category: '한식', main_menu: '칼국수', address: '서초구', distance: '100', latitude: null, longitude: null },
  { id: 'b', name: '국수집', category: '한식', main_menu: '국수', address: '서초구', distance: null, latitude: null, longitude: null },
  { id: 'c', name: '카페', category: '카페', main_menu: '커피', address: '반포동', distance: '200', latitude: null, longitude: null },
];
test('search, distance and favorite conditions combine and reset returns all rows', () => {
  const favorites = new Set(['a', 'b']);
  const filters = { query: '국수 서초', maxDistance: 100, favoritesOnly: true };
  assert.deepEqual(filterRestaurants(rows, filters, favorites).map(row => row.id), ['a']);
  favorites.delete('a');
  assert.deepEqual(filterRestaurants(rows, filters, favorites), []);
  assert.equal(filterRestaurants(rows, DEFAULT_FILTERS, favorites).length, 3);
  assert.equal(filterRestaurants(rows, { ...DEFAULT_FILTERS, maxDistance: 200 }, favorites).length, 2);
});
