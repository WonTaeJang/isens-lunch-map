'use client';

import Button from '@/components/ui/button';
import type { ImportPreview } from '@/lib/restaurant-types';

type Props = {
  busy: boolean;
  file: File | null;
  onFileChange: (value: File | null) => void;
  preview: ImportPreview | null;
  message: string;
  error: string | null;
  upload: (mode: 'preview' | 'commit') => Promise<void>;
};

export default function ExcelImportSection({
  busy,
  file,
  onFileChange,
  preview,
  message,
  error,
  upload,
}: Props) {
  return (
    <section className="upload-section">
      <h2>엑셀로 업데이트</h2>
      <p className="description">
        가맹점명·주소가 같은 식당은 갱신됩니다. 파일에 없는 기존 식당과 취소선 항목은
        비활성화됩니다. 다음 업로드 시 수동 상태보다 엑셀 상태가 우선합니다.
      </p>
      <div className="upload-placeholder">
        <label className="description">
          전체 식당 목록 (.xlsx, 최대 3MB)
          <input
            aria-label="엑셀 파일"
            type="file"
            accept=".xlsx"
            disabled={busy}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            className="admin-input"
          />
        </label>
        <Button loading={busy} disabled={!file || !!error} onClick={() => upload('preview')}>
          데이터 검증 및 미리보기
        </Button>
        <small>
          카테고리 / 가맹점명 / 대표메뉴 / 주소 / 거리 헤더를 인식합니다. 숨겨진 시트는 제외합니다.
          취소선은 해당 행의 데이터 셀 중 하나라도 있으면 적용됩니다.
        </small>
      </div>
      <p role="status" className="description">
        {message || error}
      </p>
      {preview && (
        <div>
          <p className="description">
            신규 {preview.summary.added}건 · 갱신 {preview.summary.updated}건 · 취소선 비활성{' '}
            {preview.summary.inactive}건 · 누락 비활성 {preview.summary.missing}건
          </p>
          <p className="description">
            저장 시 필요한 좌표를 조회합니다. 주소 검색에 실패한 식당은 주소·좌표 없이 저장되며,
            아래 주소 오류 목록에서 수정할 수 있습니다.
          </p>
          <p className="description">
            {preview.rows.length
              ? `변경 예정 ${preview.rows.length}개 식당만 표시합니다.`
              : '변경사항이 없습니다.'}
          </p>
          {preview.rows.length > 0 && (
            <div className="table-scroll" style={{ maxHeight: 300 }}>
              <table className="import-preview-table">
                <thead>
                  <tr>
                    <th>행</th>
                    <th>가맹점명</th>
                    <th>주소</th>
                    <th>반영 상태</th>
                    <th>변경사항</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.row ?? '—'}</td>
                      <td>{row.name}</td>
                      <td>{row.address ?? '주소 확인 필요'}</td>
                      <td>{row.active ? '활성' : '비활성'}</td>
                      <td>{row.changes.join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button loading={busy} disabled={!preview.rows.length} onClick={() => upload('commit')}>
            전체 목록을 DB에 반영
          </Button>
        </div>
      )}
    </section>
  );
}
