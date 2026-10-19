import 'server-only';
import { hasCoordinates } from '@/lib/coordinates';
import { officeDistance, parseDistance } from '@/lib/distance';
import type { DistanceChange, DistancePreview } from '@/lib/restaurant-types';
import { revision, writeLocked } from './admin';
import { AdminError } from './admin';
import type { Restaurant } from './restaurants';

// 거리 재측정: 저장된 좌표로 아이센스 빌딩 기준 직선거리를 다시 계산합니다.
// 엑셀 업데이트·주소 수정은 같은 officeDistance로 저장하므로, 이 기능은 기존 데이터를 맞출 때 씁니다.

/** Shown when a restaurant changed between a re-measure preview and its save. */
export const STALE_REMEASURE = '재측정 이후 식당 정보가 변경되었습니다. 다시 재측정해 주세요.';

/** Restaurants whose stored distance differs from the recomputed one, largest change first. */
export function distanceChanges(rows: Restaurant[]): DistanceChange[] {
  const gap = ({ before, after }: DistanceChange) =>
    before === null || after === null || !Number.isFinite(before) ? -1 : Math.abs(after - before);
  return rows
    .flatMap((row) => {
      const before = parseDistance(row.distance);
      const after = officeDistance(row);
      return before === after
        ? []
        : [{ id: row.id, name: row.name, active: row.active === true, before, after }];
    })
    .sort((a, b) => gap(b) - gap(a) || a.name.localeCompare(b.name, 'ko'));
}

export function previewDistances(rows: Restaurant[]): DistancePreview {
  const changes = distanceChanges(rows);
  return {
    rows: changes,
    summary: {
      total: rows.length,
      changed: changes.length,
      missingCoordinates: rows.filter((row) => !hasCoordinates(row)).length,
    },
    revision: revision(rows),
  };
}

/** Saves the previewed distances. Fails when any restaurant changed after the preview. */
export async function applyDistances(expected: unknown) {
  if (typeof expected !== 'string') throw new AdminError('재측정 요청이 올바르지 않습니다.');
  return writeLocked(expected, STALE_REMEASURE, async (client, rows) => {
    const changes = distanceChanges(rows);
    for (const change of changes)
      await client.query(
        'update public.restaurants set distance=$1, updated_at=now() where id=$2',
        [change.after, change.id],
      );
    return { updated: changes.length };
  });
}
