import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metersBetween, officeDistance } from '../lib/distance';
import {
  applyCoordinates,
  coordinateChanges,
  previewCoordinates,
  type FoundCoordinates,
} from '../lib/server/coordinates';
import { AddressNotFoundError, GeocodingUnavailableError } from '../lib/server/import/geocoder';
import { revision } from '../lib/server/admin-writes';
import { mockDb, restaurant as makeRestaurant } from './helpers/restaurants';
import type { Restaurant } from '../lib/server/restaurants';

process.env.ADMIN_PASSWORD ??= 'test-password';

const BUILDING = { latitude: '37.4900000', longitude: '127.0100000' };
// About 4 m north of BUILDING, like a row moved by docs/duplicate-coordinates.md.
const SPREAD = { latitude: '37.4900359', longitude: '127.0100000' };
// Well under 1 m away: the same place.
const NUDGED = { latitude: '37.4900001', longitude: '127.0100000' };

const restaurant = (overrides: Partial<Restaurant>) =>
  makeRestaurant({ address: '서울 서초구 반포대로 1', ...BUILDING, ...overrides });

const rows = [
  restaurant({ name: '그대로' }),
  restaurant({ name: '살짝 다름', ...NUDGED }),
  restaurant({ name: '펼쳐짐', ...SPREAD, active: false }),
  restaurant({ name: '좌표 없음', latitude: null, longitude: null }),
  restaurant({ name: '못 찾음', address: '없는 주소 1' }),
  restaurant({ name: '주소 없음', address: null, latitude: null, longitude: null }),
];

test('metersBetween measures a 4 m spread', () => {
  const meters = metersBetween(
    { latitude: Number(BUILDING.latitude), longitude: Number(BUILDING.longitude) },
    { latitude: Number(SPREAD.latitude), longitude: Number(SPREAD.longitude) },
  );
  assert.ok(meters > 3.9 && meters < 4.1, String(meters));
});

test('changes list moves of 1 m or more and missing coordinates; failures stay apart', () => {
  const found: FoundCoordinates = new Map([
    ['서울 서초구 반포대로 1', BUILDING],
    ['없는 주소 1', null],
  ]);
  const { changes, failed } = coordinateChanges(rows, found);
  assert.deepEqual(
    changes.map(({ name, moved, active }) => [name, moved, active]),
    [
      ['좌표 없음', null, true],
      ['펼쳐짐', 4, false],
    ],
  );
  assert.deepEqual(changes[1].before, SPREAD);
  assert.deepEqual(changes[1].after, BUILDING);
  assert.deepEqual(
    failed.map((f) => f.name),
    ['못 찾음'],
  );
});

test('preview looks each address up once and counts restaurants without an address', async () => {
  const looked: string[] = [];
  const preview = await previewCoordinates(rows, async (address) => {
    looked.push(address);
    if (address === '없는 주소 1') throw new AddressNotFoundError('not found');
    return BUILDING;
  });
  assert.deepEqual(looked.sort(), ['서울 서초구 반포대로 1', '없는 주소 1']);
  assert.deepEqual(preview.summary, { total: 6, missingAddress: 1 });
  assert.equal(preview.rows.length, 2);
  assert.equal(preview.failed.length, 1);
  assert.equal(preview.revision, revision(rows));
});

test('a geocoding outage fails the whole preview', async () => {
  await assert.rejects(
    previewCoordinates(rows, async () => {
      throw new GeocodingUnavailableError('down');
    }),
    /down/,
  );
});

async function savedPreview() {
  return previewCoordinates(rows, async (address) => {
    if (address === '없는 주소 1') throw new AddressNotFoundError('not found');
    return BUILDING;
  });
}
const body = (preview: Awaited<ReturnType<typeof savedPreview>>) => ({
  revision: preview.revision,
  token: preview.token,
  changes: preview.rows.map((r) => ({ id: r.id, ...r.after })),
});

test('applying saves the previewed coordinates and their distances in a locked transaction', async () => {
  const preview = await savedPreview();
  const calls = mockDb(rows);
  assert.deepEqual(await applyCoordinates(body(preview)), { updated: 2 });
  const updates = calls.filter((c) => c.text.startsWith('update public.restaurants'));
  assert.deepEqual(
    updates.map((c) => c.values),
    preview.rows.map((r) => [
      BUILDING.latitude,
      BUILDING.longitude,
      officeDistance(BUILDING),
      r.id,
    ]),
  );
  assert.ok(calls.some((c) => c.text.startsWith('LOCK TABLE')));
  assert.equal(calls.at(-1)?.text, 'COMMIT');
});

test('tampered coordinates are refused before touching the DB', async () => {
  const preview = await savedPreview();
  const calls = mockDb(rows);
  const tampered = body(preview);
  tampered.changes[0] = { ...tampered.changes[0], latitude: '37.5' };
  await assert.rejects(applyCoordinates(tampered), /결과가 올바르지/);
  await assert.rejects(applyCoordinates({ ...body(preview), token: 'x' }), /결과가 올바르지/);
  await assert.rejects(applyCoordinates({ revision: 'r' }), /요청이 올바르지/);
  await assert.rejects(
    applyCoordinates({ ...body(preview), changes: [{ id: 'nope', ...BUILDING }] }),
    /요청이 올바르지/,
  );
  assert.equal(calls.length, 0);
});

test('a change after the preview rolls back without writing', async () => {
  const preview = await savedPreview();
  const calls = mockDb([...rows, restaurant({ name: '새 식당' })]);
  await assert.rejects(applyCoordinates(body(preview)), /다시 재측정/);
  assert.ok(!calls.some((c) => c.text.startsWith('update')));
  assert.equal(calls.at(-1)?.text, 'ROLLBACK');
});
