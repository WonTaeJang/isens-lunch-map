import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDistance, officeDistance, parseDistance } from '../lib/distance';
import { OFFICE_POSITION } from '../lib/office';
import { applyDistances, distanceChanges, previewDistances } from '../lib/server/distances';
import { revision } from '../lib/server/import/sync';
import type { Restaurant } from '../lib/server/restaurants';

const at = (dLat: number, dLng = 0) => ({
  latitude: String(OFFICE_POSITION.latitude + dLat),
  longitude: String(OFFICE_POSITION.longitude + dLng),
});

test('officeDistance is the straight-line distance from the office in 10 m steps', () => {
  assert.equal(officeDistance(at(0)), 0);
  assert.equal(officeDistance(at(0.001)), 110); // 0.001° of latitude ≈ 111 m
  assert.equal(officeDistance(at(0, 0.001)), 90); // longitude shrinks with cos(37.5°)
  assert.equal(officeDistance(at(-0.01)), 1110);
  for (const bad of [
    { latitude: null, longitude: '127' },
    { latitude: '', longitude: '127' },
    { latitude: 'x', longitude: '127' },
    { latitude: '91', longitude: '127' },
  ])
    assert.equal(officeDistance(bad), null);
});

test('stored distances parse as meters and format as m or km', () => {
  assert.equal(parseDistance(null), null);
  assert.equal(parseDistance(' '), null);
  assert.equal(parseDistance('120'), 120);
  assert.ok(Number.isNaN(parseDistance('abc')));
  assert.equal(formatDistance('950'), '950m');
  assert.equal(formatDistance('1110'), '1.11km');
  assert.equal(formatDistance('2000'), '2km');
  for (const bad of [null, '', 'abc', '-10']) assert.equal(formatDistance(bad), '거리 정보 없음');
});

let seq = 0;
function restaurant(overrides: Partial<Restaurant>): Restaurant {
  return {
    id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
    name: `식당 ${seq}`,
    category: null,
    main_menu: null,
    address: '주소',
    distance: null,
    active: true,
    ...at(0.001),
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}
const rows = [
  restaurant({ name: '같음', distance: '110' }),
  restaurant({ name: '조금 다름', distance: '100' }),
  restaurant({ name: '많이 다름', distance: '700', active: false }),
  restaurant({ name: '거리 없음', distance: null }),
  restaurant({ name: '좌표 없음', distance: '300', latitude: null, longitude: null }),
];

test('distance preview lists only changes, largest first, and counts missing coordinates', () => {
  const changes = distanceChanges(rows);
  assert.deepEqual(
    changes.map(({ name, before, after, active }) => [name, before, after, active]),
    [
      ['많이 다름', 700, 110, false],
      ['조금 다름', 100, 110, true],
      ['거리 없음', null, 110, true],
      ['좌표 없음', 300, null, true],
    ],
  );
  assert.deepEqual(previewDistances(rows).summary, {
    total: 5,
    changed: 4,
    missingCoordinates: 1,
  });
  assert.equal(previewDistances(rows).revision, revision(rows));
});

function mockDb(current: Restaurant[]) {
  const calls: { text: string; values?: unknown[] }[] = [];
  const client = {
    query: async (text: string, values?: unknown[]) => {
      calls.push({ text, values });
      return { rows: text.startsWith('select id') ? current : [] };
    },
    release: () => {},
  };
  (globalThis as unknown as { lunchDb: unknown }).lunchDb = { connect: async () => client };
  return calls;
}

test('applying distances updates only changed rows inside a locked transaction', async () => {
  const calls = mockDb(rows);
  assert.deepEqual(await applyDistances(revision(rows)), { updated: 4 });
  const updates = calls.filter((c) => c.text.startsWith('update public.restaurants'));
  assert.deepEqual(
    updates.map((c) => c.values),
    distanceChanges(rows).map((c) => [c.after, c.id]),
  );
  assert.ok(calls.some((c) => c.text.startsWith('LOCK TABLE')));
  assert.equal(calls.at(-1)?.text, 'COMMIT');
});

test('a stale or missing revision rolls back without writing', async () => {
  const calls = mockDb(rows);
  await assert.rejects(applyDistances('stale'), /다시 재측정/);
  assert.ok(!calls.some((c) => c.text.startsWith('update')));
  assert.equal(calls.at(-1)?.text, 'ROLLBACK');
  await assert.rejects(applyDistances(undefined), /요청이 올바르지/);
});
