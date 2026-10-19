'use client';

import styles from './admin.module.css';
import RemeasureSection from './remeasure-section';
import type {
  CoordinateChange,
  CoordinateFailure,
  CoordinatePreview,
} from '@/lib/admin/preview-types';

type Props = {
  busy: boolean;
  preview: CoordinatePreview | null;
  message: string;
  error: string | null;
  measure: (mode: 'preview' | 'apply') => Promise<void>;
};

function movedLabel({ moved }: CoordinateChange) {
  if (moved === null) return '새로 저장';
  return `${moved.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}m`;
}

function NameCell({ row }: { row: CoordinateFailure }) {
  return (
    <td>
      {row.name}
      {!row.active && <span className="subtle"> (비활성)</span>}
    </td>
  );
}

/** Looks up every stored address on Kakao again, shows what moved, then saves on request. */
export default function CoordinateSection({ busy, preview, message, error, measure }: Props) {
  return (
    <RemeasureSection
      title="좌표 재측정"
      description={
        <>
          <p className="description">
            저장된 주소로 카카오 좌표를 다시 받아, 지금 좌표와 1m 이상 다른 식당을 보여 줍니다.
            반영하면 위도·경도와 거리를 함께 저장합니다. 주소를 하나로 찾지 못한 식당은 좌표를
            그대로 둡니다.
          </p>
          <p className="description">식당 수에 따라 검색에 1분 정도 걸릴 수 있습니다.</p>
        </>
      }
      busy={busy}
      loadingLabel="주소 검색 중…"
      message={message}
      error={error}
      previewed={!!preview}
      changeCount={preview?.rows.length ?? 0}
      applyLabel="재측정 좌표"
      measure={measure}
    >
      {preview && (
        <>
          <p className="description">
            전체 {preview.summary.total}곳 · 검색{' '}
            {preview.summary.total - preview.summary.missingAddress}곳 · 변경 {preview.rows.length}
            건 · 주소 확인 필요 {preview.failed.length}곳 · 주소 없음{' '}
            {preview.summary.missingAddress}곳
          </p>
          <p className="description">
            {preview.rows.length
              ? '좌표가 없던 식당을 먼저, 그다음 많이 움직인 순서로 표시합니다.'
              : '모든 식당의 좌표가 카카오 검색 결과와 같습니다.'}
          </p>
          {preview.rows.length > 0 && (
            <div className={`${styles.tableScroll} ${styles.previewScroll}`}>
              <table className={`${styles.table} ${styles.coordinates}`}>
                <thead>
                  <tr>
                    <th>가맹점명</th>
                    <th>주소</th>
                    <th>이동 거리</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.id}>
                      <NameCell row={row} />
                      <td>{row.address}</td>
                      <td>{movedLabel(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.failed.length > 0 && (
            <>
              <p className="description">
                아래 식당은 주소를 하나로 찾지 못해 좌표를 바꾸지 않습니다. 식당 리스트의 주소 오류
                탭이나 엑셀에서 주소를 고쳐 주세요.
              </p>
              <div className={`${styles.tableScroll} ${styles.previewScroll}`}>
                <table className={`${styles.table} ${styles.coordinates}`}>
                  <thead>
                    <tr>
                      <th>가맹점명</th>
                      <th>주소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.failed.map((row) => (
                      <tr key={row.id}>
                        <NameCell row={row} />
                        <td>{row.address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </RemeasureSection>
  );
}
