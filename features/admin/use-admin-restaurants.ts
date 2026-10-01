'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { RestaurantRow as Row, ImportPreview as Preview } from '@/lib/restaurant-types';
import { updateRestaurant, previewImport, commitImport } from './admin-api';
export default function useAdminRestaurants(restaurants: Row[]) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
    const activeCount = restaurants.filter(r => r.active === true).length;
    const visibleRestaurants = restaurants.filter(r => (r.active === true) === (activeTab === 'active'));
    const [password, setPassword] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [saving, setBusy] = useState(false);
    const [refreshing, startRefresh] = useTransition();
    const requestInFlight = useRef(false);
    const busy = saving || refreshing;
    function refresh() { startRefresh(() => router.refresh()); }
    const [message, setMessage] = useState('');
    const [addresses, setAddresses] = useState<Record<string, string>>({});
    const [addressMessage, setAddressMessage] = useState('');
    const addressErrors = restaurants.filter(r => r.address === null);
    async function saveAddress(row: Row) {
        if (!password) {
            setAddressMessage('상단에 관리자 비밀번호를 입력해 주세요.');
            return;
        }
        if (requestInFlight.current || refreshing)
            return;
        requestInFlight.current = true;
        setBusy(true);
        setAddressMessage('');
        try {
            await updateRestaurant(password, { action: 'address', id: row.id, address: addresses[row.id] ?? row.address ?? '', previousAddress: row.address });
            setPreview(null);
            setAddressMessage(`${row.name}: 주소와 좌표를 저장했습니다.`);
            refresh();
        }
        catch (e) {
            setAddressMessage(e instanceof Error ? e.message : '주소 수정에 실패했습니다.');
        }
        finally {
            requestInFlight.current = false;
            setBusy(false);
        }
    }
    async function upload(mode: 'preview' | 'commit') {
        if (!file || !password) {
            setMessage('관리자 비밀번호와 파일을 입력해 주세요.');
            return;
        }
        if (requestInFlight.current || refreshing)
            return;
        requestInFlight.current = true;
        setBusy(true);
        setMessage('');
        try {
            const form = new FormData();
            form.set('file', file);
            form.set('mode', mode);
            if (preview) {
                form.set('revision', preview.revision);
                form.set('token', preview.token);
            }
            if (mode === 'preview')
                setPreview(await previewImport(password, form));
            else {
                const result = await commitImport(password, form);
                setPreview(null);
                setMessage(`저장 완료: 신규 ${result.summary.added}건, 갱신 ${result.summary.updated}건, 누락 비활성화 ${result.summary.missing}건, 주소 확인 필요 ${result.summary.addressErrors}건`);
                refresh();
            }
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : '요청에 실패했습니다. 목록을 새로고침해 반영 여부를 확인해 주세요.');
            if (mode === 'preview')
                setPreview(null);
        }
        finally {
            requestInFlight.current = false;
            setBusy(false);
        }
    }
    async function toggle(row: Row, active: boolean) {
        if (!password) {
            setMessage('관리자 비밀번호를 입력해 주세요.');
            return;
        }
        if (requestInFlight.current || refreshing)
            return;
        requestInFlight.current = true;
        setBusy(true);
        setMessage('');
        try {
            await updateRestaurant(password, { id: row.id, active, previous: !!row.active });
            setPreview(null);
            setMessage(`${row.name}: ${active ? '활성' : '비활성'}으로 변경했습니다.`);
            refresh();
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : '상태 변경에 실패했습니다.');
        }
        finally {
            requestInFlight.current = false;
            setBusy(false);
        }
    }
    function onFileChange(next: File | null) { setFile(next); setPreview(null); setMessage(''); }
    function onAddressChange(id: string, value: string) { setAddresses(current => ({ ...current, [id]: value })); }
    return { activeTab, onTabChange: setActiveTab, activeCount, visibleRestaurants, password, onPasswordChange: setPassword, file, onFileChange, preview, busy, message, addresses, onAddressChange, addressMessage, addressErrors, saveAddress, upload, toggle };
}
