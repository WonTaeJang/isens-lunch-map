'use client';

import { useEffect, useState } from 'react';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';
import LoadingStatus from '@/components/ui/loading-status';
import { showSnackbar } from '@/components/ui/snackbar';
import useFavorites from '@/features/favorites/use-favorites';
import useTodayLunch from '@/features/lunch-visits/use-today-lunch';
import type { BlacklistedRestaurant } from '@/lib/blacklist/model';
import { blacklistStore } from './blacklist-store';
import { hideBlockReason } from './blacklist-rules';
import useBlacklist from './use-blacklist';
import styles from './blacklist-list.module.css';

/**
 * The user page tab of hidden restaurants. A restaurant shown again keeps its row (eye open)
 * until the page reloads, even after switching tabs, so it can be hidden again right there.
 */
export default function BlacklistList({
  userId,
  inactiveClassName,
}: {
  userId: string;
  /** The user page's look for a deactivated restaurant row. */
  inactiveClassName: string;
}) {
  const { ids, setHidden } = useBlacklist();
  const favorites = useFavorites();
  const todayLunch = useTodayLunch().visit;
  const [rows, setRows] = useState<BlacklistedRestaurant[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    blacklistStore
      .load(userId)
      .then((loaded) => active && setRows(loaded))
      .catch((cause) => {
        if (active)
          setError(cause instanceof Error ? cause.message : '숨긴 식당을 불러오지 못했어요.');
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (error)
    return (
      <p className="review-error" role="alert">
        {error}
      </p>
    );
  if (!rows) return <LoadingStatus label="숨긴 식당을 불러오는 중…" />;
  if (!rows.length)
    return (
      <p className="review-empty">
        숨긴 식당이 없어요. 지도 카드의 눈 아이콘으로 안 가는 식당을 숨길 수 있어요.
      </p>
    );

  async function toggle(row: BlacklistedRestaurant, hide: boolean) {
    setBusy(row.restaurant_id);
    await setHidden(row.restaurant_id, hide);
    setBusy(null);
  }

  return (
    <ul className="review-list">
      {rows.map((row) => {
        const isHidden = ids?.has(row.restaurant_id) ?? true;
        const blocked = isHidden
          ? null
          : hideBlockReason({
              favorite: favorites.has(row.restaurant_id),
              todayLunch: todayLunch?.restaurant_id === row.restaurant_id,
            });
        return (
          <li
            key={row.restaurant_id}
            className={`review-item${row.restaurant_active ? '' : ` ${inactiveClassName}`}`}
          >
            <div className={styles.row}>
              <div className={styles.name}>
                <h2>{row.restaurant_name}</h2>
                <p className="subtle">
                  {row.restaurant_category || '분류 정보 없음'}
                  {!row.restaurant_active && ' · 현재 비활성 식당이에요'}
                </p>
              </div>
              <button
                type="button"
                className={styles.toggle}
                aria-pressed={!isHidden}
                aria-busy={busy === row.restaurant_id || undefined}
                aria-disabled={blocked ? true : undefined}
                aria-label={`${row.restaurant_name} ${isHidden ? '다시 보기' : '다시 숨기기'}`}
                title={blocked ?? (isHidden ? '지도와 점심 리스트에 다시 보여요' : '다시 숨기기')}
                onClick={() => {
                  if (busy) return;
                  if (blocked) showSnackbar(blocked);
                  else void toggle(row, !isHidden);
                }}
              >
                {isHidden ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                {isHidden ? '다시 보기' : '보이는 중'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
