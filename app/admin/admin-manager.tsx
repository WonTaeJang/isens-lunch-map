'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Toggle from '../components/toggle';

type Row = { id: string; name: string; category: string | null; main_menu: string | null; address: string | null; latitude: string | null; longitude: string | null; active: boolean | null; distance: string | null };
type Preview = { rows: { name: string; address: string | null; latitude: string | null; longitude: string | null; active: boolean; row: number }[]; summary: { added: number; updated: number; inactive: number; missing: number }; revision: string; token: string };
export default function AdminManager({ restaurants, error }: { restaurants: Row[]; error: string | null }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const activeCount = restaurants.filter(r => r.active === true).length;
  const visibleRestaurants = restaurants.filter(r => (r.active === true) === (activeTab === 'active'));
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [addressMessage, setAddressMessage] = useState('');
  const addressErrors = restaurants.filter(r => r.address === null);
  async function saveAddress(row: Row) {
    if (!password) { setAddressMessage('상단에 관리자 비밀번호를 입력해 주세요.'); return; }
    setBusy(true); setAddressMessage('');
    try {
      const response = await fetch('/api/admin/restaurants', {method:'PATCH', headers:{'Content-Type':'application/json','x-admin-password':password}, body:JSON.stringify({action:'address', id:row.id, address:addresses[row.id] ?? row.address ?? "", previousAddress:row.address})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPreview(null); setAddressMessage(`${row.name}: 주소와 좌표를 저장했습니다.`); router.refresh();
    } catch(e) { setAddressMessage(e instanceof Error ? e.message : '주소 수정에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  async function upload(mode: 'preview' | 'commit') {
    if (!file || !password) { setMessage('관리자 비밀번호와 파일을 입력해 주세요.'); return; }
    setBusy(true); setMessage('');
    try {
      const form = new FormData(); form.set('file', file); form.set('mode', mode);
      if (preview) { form.set('revision', preview.revision); form.set('token', preview.token); }
      const response = await fetch('/api/admin/restaurants', { method:'POST', headers:{'x-admin-password': password}, body:form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (mode === 'preview') setPreview(result);
      else { setPreview(null); setMessage(`저장 완료: 신규 ${result.summary.added}건, 갱신 ${result.summary.updated}건, 누락 비활성화 ${result.summary.missing}건, 주소 확인 필요 ${result.summary.addressErrors}건`); router.refresh(); }
    } catch (e) { setMessage(e instanceof Error ? e.message : '요청에 실패했습니다. 목록을 새로고침해 반영 여부를 확인해 주세요.'); if (mode === 'preview') setPreview(null); }
    finally { setBusy(false); }
  }
  async function toggle(row: Row, active: boolean) {
    if (!password) { setMessage('관리자 비밀번호를 입력해 주세요.'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/restaurants', {method:'PATCH', headers:{'Content-Type':'application/json','x-admin-password':password}, body:JSON.stringify({id:row.id, active, previous:!!row.active})});
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setPreview(null); setMessage(`${row.name}: ${row.active ? '비활성' : '활성'}으로 변경했습니다.`); router.refresh();
    } catch(e) { setMessage(e instanceof Error ? e.message : '상태 변경에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <>
    <section className="upload-section">
      <h2>엑셀로 전체 리스트 업데이트</h2>
      <p className="description">가맹점명·주소가 같은 식당은 갱신됩니다. 파일에 없는 기존 식당과 취소선 항목은 비활성화됩니다. 다음 업로드 시 수동 상태보다 엑셀 상태가 우선합니다.</p>
      <div className="upload-placeholder">
        <label>관리자 비밀번호 <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy} className="admin-input" /></label>
        <label className="description">전체 식당 목록 (.xlsx, 최대 3MB)<input aria-label="엑셀 파일" type="file" accept=".xlsx" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);setPreview(null);setMessage('');}} className="admin-input" /></label>
        <button className="button" disabled={busy || !file || !password || !!error} onClick={()=>upload('preview')}>{busy ? '처리 중…' : '데이터 검증 및 미리보기'}</button>
        <small>카테고리 / 가맹점명 / 대표메뉴 / 주소 / 거리 헤더를 인식합니다. 숨겨진 시트는 제외합니다. 취소선은 해당 행의 데이터 셀 중 하나라도 있으면 적용됩니다.</small>
      </div>
      <p role="status" className="description">{message || error}</p>
      {preview && <div>
        <p className="description">신규 {preview.summary.added}건 · 갱신 {preview.summary.updated}건 · 취소선 비활성 {preview.summary.inactive}건 · 누락 비활성 {preview.summary.missing}건</p>
        <p className="description">저장 시 필요한 좌표를 조회합니다. 주소 검색에 실패한 식당은 주소·좌표 없이 저장되며, 아래 주소 오류 목록에서 수정할 수 있습니다.</p>
        <div className="table-scroll" style={{maxHeight:300}}><table><thead><tr><th>행</th><th>가맹점명</th><th>주소</th><th>반영 상태</th></tr></thead><tbody>{preview.rows.map(r=><tr key={r.row}><td>{r.row}</td><td>{r.name}</td><td>{r.address}</td><td>{r.active?'활성':'비활성'}</td></tr>)}</tbody></table></div>
        <button className="button" disabled={busy} onClick={()=>upload('commit')}>전체 목록을 DB에 반영</button>
      </div>}
    </section>
    <section className="table-section"><h2>등록된 식당 <span className="count">{error ? '—' : restaurants.length}</span></h2>
      <div className="restaurant-tabs" role="tablist" aria-label="식당 활성 상태">
        {(['active', 'inactive'] as const).map(tab => <button
          key={tab} type="button" role="tab" id={`restaurant-tab-${tab}`}
          aria-selected={activeTab === tab} aria-controls="restaurant-panel" tabIndex={activeTab === tab ? 0 : -1}
          onClick={()=>setActiveTab(tab)}
          onKeyDown={e=>{
            if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
            e.preventDefault();
            const next = e.key === 'Home' ? 'active' : e.key === 'End' ? 'inactive' : activeTab === 'active' ? 'inactive' : 'active';
            setActiveTab(next);
            document.getElementById(`restaurant-tab-${next}`)?.focus();
          }}
        >{tab === 'active' ? '활성화' : '비활성화'} <span>{error ? '—' : tab === 'active' ? activeCount : restaurants.length-activeCount}</span></button>)}
      </div>
      <div id="restaurant-panel" role="tabpanel" aria-labelledby={`restaurant-tab-${activeTab}`} tabIndex={0} className="table-scroll"><table><thead><tr><th>식당명</th><th>분류 / 메뉴</th><th>주소</th><th>거리</th><th>상태</th></tr></thead><tbody>{visibleRestaurants.map(r=><tr key={r.id}><td style={{textDecoration:r.active?'none':'line-through'}}>{r.name}</td><td>{r.category}<br/>{r.main_menu}</td><td>{r.address || '주소 확인 필요'}</td><td>{r.distance === null ? '—' : `${r.distance}m`}</td><td><Toggle label={`${r.name} 활성 상태`} checked={!!r.active} disabled={busy || !!error} onCheckedChange={active=>{void toggle(r, active);}} onLabel="활성" offLabel="비활성" /></td></tr>)}{!visibleRestaurants.length && <tr><td colSpan={5}><div className="table-empty">{error ? '목록을 불러오지 못했습니다.' : `${activeTab === 'active' ? '활성화된' : '비활성화된'} 식당이 없습니다.`}</div></td></tr>}</tbody></table></div>
    </section>
    <section className="table-section">
      <h2>주소 오류 식당 <span className="count">{addressErrors.length}</span></h2>
      <p className="description">좌표가 없는 식당은 지도에 표시되지 않습니다. 도로명과 건물번호를 입력하고 검색하면 주소와 좌표를 함께 저장합니다. 활성 상태는 유지됩니다.</p>
      <p role="status" className="description">{addressMessage}</p>
      <div className="table-scroll"><table><thead><tr><th>식당명</th><th>상태</th><th>주소 수정</th></tr></thead><tbody>
        {addressErrors.map(r=><tr key={r.id}><td>{r.name}</td><td>주소 검색 필요</td><td>
          <form onSubmit={e=>{e.preventDefault();void saveAddress(r);}}>
            <input className="admin-input" aria-label={`${r.name} 수정 주소`} value={addresses[r.id] ?? r.address ?? ""} onChange={e=>setAddresses(prev=>({...prev,[r.id]:e.target.value}))} maxLength={500} required disabled={busy} />
            <button className="button" type="submit" disabled={busy || !!error}>주소 검색 및 저장</button>
          </form>
        </td></tr>)}
        {!addressErrors.length && <tr><td colSpan={3}><div className="table-empty">{error ? '목록을 불러오지 못했습니다.' : '주소 오류가 없습니다.'}</div></td></tr>}
      </tbody></table></div>
    </section>
  </>;
}
