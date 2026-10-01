'use client';

import Tabs from '@/components/ui/tabs';
import { useState } from 'react';
import styles from './admin-manager.module.css';
import ExcelImportSection from './excel-import-section';
import RestaurantTable from './restaurant-table';
import AddressErrorSection from './address-error-section';
import useAdminRestaurants from './use-admin-restaurants';
import type { RestaurantRow } from '@/lib/restaurant-types';

const ADMIN_TABS = [
  { value: 'update', label: '업데이트' },
  { value: 'restaurants', label: '식당 리스트' },
  { value: 'statistics', label: '통계' },
] as const;
type AdminTab = (typeof ADMIN_TABS)[number]['value'];

export default function AdminManager({
  restaurants,
  error,
  password,
  onReload,
}: {
  password: string;
  onReload: () => Promise<void>;
  restaurants: RestaurantRow[];
  error: string | null;
}) {
  const [tab, setTab] = useState<AdminTab>('update');
  const admin = useAdminRestaurants(restaurants, password, onReload);
  return (
    <>
      <Tabs
        items={ADMIN_TABS}
        value={tab}
        onChange={setTab}
        idPrefix="admin"
        label="관리자 메뉴"
        className={styles.tabs}
      />
      <div
        role="tabpanel"
        id="admin-panel-update"
        aria-labelledby="admin-tab-update"
        hidden={tab !== 'update'}
        tabIndex={0}
      >
        <ExcelImportSection
          busy={admin.busy}
          file={admin.file}
          onFileChange={admin.onFileChange}
          preview={admin.preview}
          message={admin.message}
          error={error}
          upload={admin.upload}
        />
      </div>
      <div
        role="tabpanel"
        id="admin-panel-restaurants"
        aria-labelledby="admin-tab-restaurants"
        hidden={tab !== 'restaurants'}
        tabIndex={0}
      >
        <RestaurantTable
          restaurants={restaurants}
          error={error}
          activeTab={admin.activeTab}
          onTabChange={admin.onTabChange}
          errorCount={admin.addressErrors.length}
          errorContent={
            <AddressErrorSection
              addressErrors={admin.addressErrors}
              addresses={admin.addresses}
              onAddressChange={admin.onAddressChange}
              addressMessage={admin.addressMessage}
              busy={admin.busy}
              error={error}
              saveAddress={admin.saveAddress}
            />
          }
          activeCount={admin.activeCount}
          visibleRestaurants={admin.visibleRestaurants}
          busy={admin.busy}
          toggle={admin.toggle}
        />
      </div>
      <div
        role="tabpanel"
        id="admin-panel-statistics"
        aria-labelledby="admin-tab-statistics"
        hidden={tab !== 'statistics'}
        tabIndex={0}
      >
        <section className="table-section">
          <h2>통계</h2>
          <p className="description">통계 기능을 준비 중입니다.</p>
        </section>
      </div>
    </>
  );
}
