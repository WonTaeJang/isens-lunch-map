'use client';

import type { ReactNode } from 'react';
import Tabs from '@/components/ui/tabs';
import EmptyState from '@/components/ui/empty-state';
import CountBadge from '@/components/ui/count-badge';
import Toggle from '@/components/ui/toggle';
import type { RestaurantRow } from '@/lib/restaurant-types';

const STATUS_TABS = [
  { value: 'active', label: '활성화' },
  { value: 'inactive', label: '비활성화' },
  { value: 'errors', label: '오류 식당' },
] as const;
type ActiveTab = 'active' | 'inactive' | 'errors';
type Props = {
  restaurants: RestaurantRow[];
  error: string | null;
  activeTab: ActiveTab;
  onTabChange: (value: ActiveTab) => void;
  activeCount: number;
  errorCount: number;
  errorContent: ReactNode;
  visibleRestaurants: RestaurantRow[];
  busy: boolean;
  toggle: (row: RestaurantRow, active: boolean) => Promise<void>;
};

export default function RestaurantTable({
  restaurants,
  error,
  activeTab,
  onTabChange,
  activeCount,
  errorCount,
  errorContent,
  visibleRestaurants,
  busy,
  toggle,
}: Props) {
  const counts = {
    active: activeCount,
    inactive: restaurants.length - activeCount - errorCount,
    errors: errorCount,
  };
  const tabs = STATUS_TABS.map((item) => ({ ...item, count: error ? '—' : counts[item.value] }));
  return (
    <section className="table-section">
      <h2>
        등록된 식당 <CountBadge>{error ? '—' : restaurants.length}</CountBadge>
      </h2>
      <Tabs
        items={tabs}
        value={activeTab}
        onChange={onTabChange}
        idPrefix="restaurant"
        panelId="restaurant-panel"
        label="식당 분류"
        className="restaurant-tabs"
      />
      <div
        id="restaurant-panel"
        role="tabpanel"
        aria-labelledby={`restaurant-tab-${activeTab}`}
        tabIndex={0}
        className="table-scroll"
      >
        {activeTab === 'errors' ? (
          errorContent
        ) : (
          <table>
            <thead>
              <tr>
                <th>식당명</th>
                <th>분류 / 메뉴</th>
                <th>주소</th>
                <th>거리</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {visibleRestaurants.map((row) => (
                <tr key={row.id}>
                  <td style={{ textDecoration: row.active ? 'none' : 'line-through' }}>
                    {row.name}
                  </td>
                  <td>
                    {row.category}
                    <br />
                    {row.main_menu}
                  </td>
                  <td>{row.address || '주소 확인 필요'}</td>
                  <td>{row.distance === null ? '—' : `${row.distance}m`}</td>
                  <td>
                    <Toggle
                      label={`${row.name} 활성 상태`}
                      checked={!!row.active}
                      disabled={busy || !!error}
                      onCheckedChange={(active) => {
                        void toggle(row, active);
                      }}
                      onLabel="활성"
                      offLabel="비활성"
                    />
                  </td>
                </tr>
              ))}
              {!visibleRestaurants.length && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState variant="table">
                      {error
                        ? '목록을 불러오지 못했습니다.'
                        : `${activeTab === 'active' ? '활성화된' : '비활성화된'} 식당이 없습니다.`}
                    </EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
