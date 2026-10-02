'use client';

import { useRef, useState } from 'react';
import Button from '@/components/ui/button';
import PageHeading from '@/components/ui/page-heading';
import AdminManager from './admin-manager';
import { loadAdminRestaurants } from './admin-api';
import type { RestaurantRow } from '@/lib/restaurant-types';

export default function AdminGate() {
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<{ password: string; restaurants: RestaurantRow[] } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const reloading = useRef(false);
  const [reloadBusy, setReloadBusy] = useState(false);

  async function reload() {
    if (!session || reloading.current) return;
    reloading.current = true;
    setReloadBusy(true);
    try {
      const restaurants = await loadAdminRestaurants(session.password);
      setSession((current) => (current ? { ...current, restaurants } : null));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '목록을 다시 불러오지 못했습니다.');
    } finally {
      reloading.current = false;
      setReloadBusy(false);
    }
  }

  if (session)
    return (
      <>
        <PageHeading
          eyebrow="LUNCH MAP ADMIN"
          title="점심 리스트 관리"
          description="엑셀 전체 목록을 반영하고 식당의 활성 상태를 관리하세요."
        />

        <AdminManager
          password={session.password}
          restaurants={session.restaurants}
          error={error || null}
          onReload={reload}
        />

        {error && (
          <Button loading={reloadBusy} loadingLabel="불러오는 중…" onClick={() => void reload()}>
            목록 다시 불러오기
          </Button>
        )}
      </>
    );

  return (
    <section className="admin-login">
      <h1>관리자 페이지</h1>
      <p className="description">관리자 비밀번호를 입력해 주세요.</p>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending.current || !password) return;
          pending.current = true;
          setBusy(true);
          setError('');
          try {
            const restaurants = await loadAdminRestaurants(password);
            setSession({ password, restaurants });
            setPassword('');
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '인증하지 못했습니다.');
          } finally {
            pending.current = false;
            setBusy(false);
          }
        }}
      >
        <label htmlFor="admin-password">비밀번호</label>

        <input
          id="admin-password"
          className="admin-input"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          disabled={busy}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error ? 'admin-login-error' : undefined}
        />

        {error && (
          <p id="admin-login-error" className="review-error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" loading={busy} loadingLabel="확인 중…" disabled={!password}>
          확인
        </Button>
      </form>
    </section>
  );
}
