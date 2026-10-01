'use client';

import EmptyState from '@/components/ui/empty-state';
import CountBadge from '@/components/ui/count-badge';
import Toggle from '@/components/ui/toggle';
import type { RestaurantRow } from '@/lib/restaurant-types';

const STATUS_TABS = [
  { value: 'active', label: '활성화' },
  { value: 'inactive', label: '비활성화' },
] as const;
const TAB_NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End']);
type ActiveTab = 'active' | 'inactive';
type Props = {
  restaurants: RestaurantRow[];
  error: string | null;
  activeTab: ActiveTab;
  onTabChange: (value: ActiveTab) => void;
  activeCount: number;
  visibleRestaurants: RestaurantRow[];
  busy: boolean;
  toggle: (row: RestaurantRow, active: boolean) => Promise<void>;
};

export default function RestaurantTable({ restaurants, error, activeTab, onTabChange, activeCount, visibleRestaurants, busy, toggle }: Props) {
  function navigateTab(key: string) {
    const next = key === 'Home' ? 'active' : key === 'End' ? 'inactive' : activeTab === 'active' ? 'inactive' : 'active';
    onTabChange(next);
    document.getElementById(`restaurant-tab-${next}`)?.focus();
  }
  return (
    <section className="table-section">
      <h2>등록된 식당 <CountBadge>{error ? '—' : restaurants.length}</CountBadge></h2>
      <div className="restaurant-tabs" role="tablist" aria-label="식당 활성 상태">
        {STATUS_TABS.map(({ value, label }) => (
          <button
            key={value} type="button" role="tab" id={`restaurant-tab-${value}`}
            aria-selected={activeTab === value} aria-controls="restaurant-panel"
            tabIndex={activeTab === value ? 0 : -1}
            onClick={() => onTabChange(value)}
            onKeyDown={event => {
              if (!TAB_NAVIGATION_KEYS.has(event.key)) return;
              event.preventDefault();
              navigateTab(event.key);
            }}
          >
            {label} <span>{error ? '—' : value === 'active' ? activeCount : restaurants.length - activeCount}</span>
          </button>
        ))}
      </div>
      <div id="restaurant-panel" role="tabpanel" aria-labelledby={`restaurant-tab-${activeTab}`} tabIndex={0} className="table-scroll">
        <table>
          <thead><tr><th>식당명</th><th>분류 / 메뉴</th><th>주소</th><th>거리</th><th>상태</th></tr></thead>
          <tbody>
            {visibleRestaurants.map(row => (
              <tr key={row.id}>
                <td style={{ textDecoration: row.active ? 'none' : 'line-through' }}>{row.name}</td>
                <td>{row.category}<br />{row.main_menu}</td>
                <td>{row.address || '주소 확인 필요'}</td>
                <td>{row.distance === null ? '—' : `${row.distance}m`}</td>
                <td>
                  <Toggle label={`${row.name} 활성 상태`} checked={!!row.active} disabled={busy || !!error} onCheckedChange={active => { void toggle(row, active); }} onLabel="활성" offLabel="비활성" />
                </td>
              </tr>
            ))}
            {!visibleRestaurants.length && (
              <tr><td colSpan={5}><EmptyState variant="table">{error ? '목록을 불러오지 못했습니다.' : `${activeTab === 'active' ? '활성화된' : '비활성화된'} 식당이 없습니다.`}</EmptyState></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
