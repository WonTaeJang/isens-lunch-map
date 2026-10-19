import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { hasCoordinates } from '@/lib/coordinates';
import { metersBetween, officeDistance } from '@/lib/distance';
import { isUuid } from '@/lib/uuid';
import type {
  CoordinateChange,
  CoordinateFailure,
  CoordinatePreview,
} from '@/lib/admin/preview-types';
import { adminSignature, revision, writeLocked } from './admin';
import { STALE_REMEASURE } from './distances';
import { AddressNotFoundError, geocode, geocodingDeadline } from './import/geocoder';
import { AdminError } from './admin';
import type { Restaurant } from './restaurants';

// 좌표 재측정: 저장된 주소로 카카오 좌표를 다시 받아 지금 좌표와 비교합니다.
// 엑셀 업데이트는 기존 좌표를 그대로 쓰므로, SQL로 좌표를 옮겼거나(예전 4m 펼치기 등)
// 카카오 결과가 바뀐 경우 이 기능으로 맞춥니다. 저장할 때는 거리도 같은 좌표로 다시 계산합니다.
// 주소를 하나로 찾지 못한 식당은 좌표를 바꾸지 않고 따로 보여 줍니다(엑셀 가져오기와 달리 지우지 않음).

/** Smaller differences are rounding noise, not a different place. */
const MOVE_THRESHOLD_METERS = 1;
const LOOKUP_CONCURRENCY = 4;

type Coordinates = { latitude: string; longitude: string };
type Lookup = (address: string) => Promise<Coordinates>;
/** Kakao's coordinates per stored address; null when the address did not resolve to one place. */
export type FoundCoordinates = Map<string, Coordinates | null>;
type CoordinateUpdate = { id: string } & Coordinates;

const position = (c: Coordinates) => ({
  latitude: Number(c.latitude),
  longitude: Number(c.longitude),
});

/** Restaurants whose found coordinates differ from the stored ones, and those not found. */
export function coordinateChanges(rows: Restaurant[], found: FoundCoordinates) {
  const changes: CoordinateChange[] = [];
  const failed: CoordinateFailure[] = [];
  for (const row of rows) {
    if (row.address === null) continue;
    const result = found.get(row.address);
    if (result === undefined) continue;
    const base = { id: row.id, name: row.name, active: row.active === true, address: row.address };
    if (result === null) {
      failed.push(base);
      continue;
    }
    const meters = hasCoordinates(row)
      ? metersBetween(position(row as Coordinates), position(result))
      : null;
    if (meters !== null && meters < MOVE_THRESHOLD_METERS) continue;
    changes.push({
      ...base,
      before: { latitude: row.latitude, longitude: row.longitude },
      after: result,
      moved: meters === null ? null : Math.round(meters * 10) / 10,
    });
  }
  // Newly found coordinates first, then the largest moves.
  changes.sort(
    (a, b) => (b.moved ?? Infinity) - (a.moved ?? Infinity) || a.name.localeCompare(b.name, 'ko'),
  );
  failed.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return { changes, failed };
}

/** Looks up each address once, a few at a time. A service outage stops everything. */
async function lookupAll(addresses: string[], lookup: Lookup): Promise<FoundCoordinates> {
  const found: FoundCoordinates = new Map();
  const checkDeadline = geocodingDeadline();
  let next = 0;
  let stopped = false;
  async function worker() {
    while (!stopped && next < addresses.length) {
      const address = addresses[next++];
      try {
        checkDeadline();
        found.set(address, await lookup(address));
      } catch (error) {
        if (error instanceof AddressNotFoundError) found.set(address, null);
        else {
          stopped = true;
          throw error;
        }
      }
    }
  }
  const workers = Math.min(LOOKUP_CONCURRENCY, addresses.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return found;
}

/** Signs a revision with the coordinates to save, in a fixed order. */
function sign(rev: string, updates: CoordinateUpdate[]) {
  const sorted = [...updates].sort((a, b) => a.id.localeCompare(b.id));
  return adminSignature(rev, JSON.stringify(sorted.map((u) => [u.id, u.latitude, u.longitude])));
}

/** Looks up every stored address again for review; nothing is saved. */
export async function previewCoordinates(
  rows: Restaurant[],
  lookup: Lookup = geocode,
): Promise<CoordinatePreview> {
  const addresses = [...new Set(rows.flatMap((row) => (row.address === null ? [] : row.address)))];
  const { changes, failed } = coordinateChanges(rows, await lookupAll(addresses, lookup));
  const rev = revision(rows);
  return {
    rows: changes,
    failed,
    summary: {
      total: rows.length,
      missingAddress: rows.filter((row) => row.address === null).length,
    },
    revision: rev,
    token: sign(
      rev,
      changes.map((c) => ({ id: c.id, ...c.after })),
    ),
  };
}

function parseUpdates(value: unknown): CoordinateUpdate[] | null {
  if (!Array.isArray(value) || value.length > 10000) return null;
  const ids = new Set<string>();
  const updates: CoordinateUpdate[] = [];
  for (const item of value) {
    const { id, latitude, longitude } = (item ?? {}) as Record<string, unknown>;
    if (!isUuid(id) || typeof latitude !== 'string' || typeof longitude !== 'string') return null;
    if (ids.has(id) || !hasCoordinates({ latitude, longitude })) return null;
    ids.add(id);
    updates.push({ id, latitude, longitude });
  }
  return updates;
}

/**
 * Saves the coordinates shown by the preview, with distances recomputed from them.
 * Fails when the request was not that preview or any restaurant changed after it.
 */
export async function applyCoordinates(body: unknown) {
  const { revision: expected, token, changes } = (body ?? {}) as Record<string, unknown>;
  const updates = parseUpdates(changes);
  if (typeof expected !== 'string' || typeof token !== 'string' || !updates)
    throw new AdminError('재측정 요청이 올바르지 않습니다.');
  const signed = Buffer.from(sign(expected, updates));
  const given = Buffer.from(token);
  if (signed.length !== given.length || !timingSafeEqual(signed, given))
    throw new AdminError('재측정 결과가 올바르지 않습니다. 다시 재측정해 주세요.');
  return writeLocked(expected, STALE_REMEASURE, async (client) => {
    for (const update of updates)
      await client.query(
        'update public.restaurants set latitude=$1, longitude=$2, distance=$3, updated_at=now() where id=$4',
        [update.latitude, update.longitude, officeDistance(update), update.id],
      );
    return { updated: updates.length };
  });
}
