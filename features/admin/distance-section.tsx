'use client';

import Button from '@/components/ui/button';
import { formatDistance } from '@/lib/distance';
import { OFFICE_ADDRESS } from '@/lib/office';
import type { DistanceChange, DistancePreview } from '@/lib/restaurant-types';

type Props = {
  busy: boolean;
  preview: DistancePreview | null;
  message: string;
  error: string | null;
  measure: (mode: 'preview' | 'apply') => Promise<void>;
};

const meters = (value: number | null) =>
  value === null || !Number.isFinite(value) ? '—' : formatDistance(String(value));
function difference({ before, after }: DistanceChange) {
  if (after === null) return '좌표 없음';
  if (before === null || !Number.isFinite(before)) return '새로 계산';
  const delta = after - before;
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString('ko-KR')}m`;
}

/** Recomputes straight-line distances from the office, shows them, then saves on request. */
export default function DistanceSection({ busy, preview, message, error, measure }: Props) {
  return (
    <section className="upload-section">
      <h2>거리 재측정</h2>
      <p className="description">
        아이센스 빌딩({OFFICE_ADDRESS})에서 식당 좌표까지의 직선거리를 10m 단위로 다시 계산합니다.
        엑셀 업데이트와 주소 수정 때도 같은 방식으로 자동 계산합니다.
      </p>
      <Button loading={busy} disabled={!!error} onClick={() => measure('preview')}>
        재측정 결과 보기
      </Button>
      <p role="status" className="description">
        {message}
      </p>
      {preview && (
        <div>
          <p className="description">
            전체 {preview.summary.total}곳 · 변경 {preview.summary.changed}건 · 좌표 없음{' '}
            {preview.summary.missingCoordinates}곳
          </p>
          <p className="description">
            {preview.rows.length
              ? '차이가 큰 순서로 표시합니다. 좌표가 없는 식당은 거리 정보 없음으로 저장됩니다.'
              : '모든 식당의 거리가 이미 최신입니다.'}
          </p>
          {preview.rows.length > 0 && (
            <div className="table-scroll" style={{ maxHeight: 300 }}>
              <table className="import-preview-table">
                <thead>
                  <tr>
                    <th>가맹점명</th>
                    <th>현재 거리</th>
                    <th>재측정 거리</th>
                    <th>차이</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.name}
                        {!row.active && <span className="subtle"> (비활성)</span>}
                      </td>
                      <td>{meters(row.before)}</td>
                      <td>{meters(row.after)}</td>
                      <td>{difference(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button loading={busy} disabled={!preview.rows.length} onClick={() => measure('apply')}>
            재측정 거리 {preview.rows.length}건 반영
          </Button>
        </div>
      )}
    </section>
  );
}
