'use client';

import EmptyState from '@/components/ui/empty-state';
import CountBadge from '@/components/ui/count-badge';
import Button from '@/components/ui/button';
import type { RestaurantRow } from '@/lib/restaurant-types';

type Props = {
  addressErrors: RestaurantRow[];
  addresses: Record<string, string>;
  onAddressChange: (id: string, value: string) => void;
  addressMessage: string;
  busy: boolean;
  error: string | null;
  saveAddress: (row: RestaurantRow) => Promise<void>;
};

export default function AddressErrorSection({ addressErrors, addresses, onAddressChange, addressMessage, busy, error, saveAddress }: Props) {
  return (
    <section className="table-section">
      <h2>주소 오류 식당 <CountBadge>{addressErrors.length}</CountBadge></h2>
      <p className="description">좌표가 없는 식당은 지도에 표시되지 않습니다. 도로명과 건물번호를 입력하고 검색하면 주소와 좌표를 함께 저장합니다. 활성 상태는 유지됩니다.</p>
      <p role="status" className="description">{addressMessage}</p>
      <div className="table-scroll">
        <table>
          <thead><tr><th>식당명</th><th>상태</th><th>주소 수정</th></tr></thead>
          <tbody>
            {addressErrors.map(row => (
              <tr key={row.id}>
                <td>{row.name}</td><td>주소 검색 필요</td>
                <td>
                  <form onSubmit={event => { event.preventDefault(); void saveAddress(row); }}>
                    <input
                      className="admin-input" aria-label={`${row.name} 수정 주소`}
                      value={addresses[row.id] ?? row.address ?? ''}
                      onChange={event => onAddressChange(row.id, event.target.value)}
                      maxLength={500} required disabled={busy}
                    />
                    <Button type="submit" disabled={busy || !!error}>주소 검색 및 저장</Button>
                  </form>
                </td>
              </tr>
            ))}
            {!addressErrors.length && <tr><td colSpan={3}><EmptyState variant="table">{error ? '목록을 불러오지 못했습니다.' : '주소 오류가 없습니다.'}</EmptyState></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
