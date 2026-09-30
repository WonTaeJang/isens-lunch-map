'use client';
import EmptyState from '../components/empty-state';
import CountBadge from '../components/count-badge';
import Button from '../components/button';
import type { Dispatch, SetStateAction } from 'react';
import type { RestaurantRow } from '@/lib/restaurant-types';
type Props = {
 addressErrors: RestaurantRow[]; addresses: Record<string,string>; setAddresses: Dispatch<SetStateAction<Record<string,string>>>;
 addressMessage: string; busy: boolean; error: string | null; saveAddress: (row: RestaurantRow) => Promise<void>;
};
export default function AddressErrorSection(props: Props) {
  const {addressErrors, addresses, setAddresses, addressMessage, busy, error, saveAddress} = props;
  return (
    <section className="table-section">
      <h2>주소 오류 식당 <CountBadge>{addressErrors.length}</CountBadge></h2>
      <p className="description">좌표가 없는 식당은 지도에 표시되지 않습니다. 도로명과 건물번호를 입력하고 검색하면 주소와 좌표를 함께 저장합니다. 활성 상태는 유지됩니다.</p>
      <p role="status" className="description">{addressMessage}</p>
      <div className="table-scroll"><table><thead><tr><th>식당명</th><th>상태</th><th>주소 수정</th></tr></thead><tbody>
        {addressErrors.map(r=><tr key={r.id}><td>{r.name}</td><td>주소 검색 필요</td><td>
          <form onSubmit={e=>{e.preventDefault();void saveAddress(r);}}>
            <input className="admin-input" aria-label={`${r.name} 수정 주소`} value={addresses[r.id] ?? r.address ?? ""} onChange={e=>setAddresses(prev=>({...prev,[r.id]:e.target.value}))} maxLength={500} required disabled={busy} />
            <Button  type="submit" disabled={busy || !!error}>주소 검색 및 저장</Button>
          </form>
        </td></tr>)}
        {!addressErrors.length && <tr><td colSpan={3}><EmptyState variant="table">{error ? '목록을 불러오지 못했습니다.' : '주소 오류가 없습니다.'}</EmptyState></td></tr>}
      </tbody></table></div>
    </section>
  );
}
