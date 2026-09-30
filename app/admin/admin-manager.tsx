'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ExcelImportSection from './excel-import-section';
import RestaurantTable from './restaurant-table';
import AddressErrorSection from './address-error-section';

import type { RestaurantRow as Row, ImportPreview as Preview } from '@/lib/restaurant-types';
import { updateRestaurant, previewImport, commitImport } from '@/lib/admin-api';
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
      await updateRestaurant(password, {action:'address', id:row.id, address:addresses[row.id] ?? row.address ?? '', previousAddress:row.address});
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
      if (mode === 'preview') setPreview(await previewImport(password, form));
      else {
        const result = await commitImport(password, form);
        setPreview(null); setMessage(`저장 완료: 신규 ${result.summary.added}건, 갱신 ${result.summary.updated}건, 누락 비활성화 ${result.summary.missing}건, 주소 확인 필요 ${result.summary.addressErrors}건`); router.refresh();
      }
    } catch (e) { setMessage(e instanceof Error ? e.message : '요청에 실패했습니다. 목록을 새로고침해 반영 여부를 확인해 주세요.'); if (mode === 'preview') setPreview(null); }
    finally { setBusy(false); }
  }
  async function toggle(row: Row, active: boolean) {
    if (!password) { setMessage('관리자 비밀번호를 입력해 주세요.'); return; }
    setBusy(true); setMessage('');
    try {
      await updateRestaurant(password, {id:row.id, active, previous:!!row.active});
      setPreview(null); setMessage(`${row.name}: ${row.active ? '비활성' : '활성'}으로 변경했습니다.`); router.refresh();
    } catch(e) { setMessage(e instanceof Error ? e.message : '상태 변경에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <>
    <ExcelImportSection {...{password, setPassword, busy, file, setFile, preview, setPreview, message, setMessage, error, upload}} />
    <RestaurantTable {...{restaurants, error, activeTab, setActiveTab, activeCount, visibleRestaurants, busy, toggle}} />
    <AddressErrorSection {...{addressErrors, addresses, setAddresses, addressMessage, busy, error, saveAddress}} />
  </>;
}
