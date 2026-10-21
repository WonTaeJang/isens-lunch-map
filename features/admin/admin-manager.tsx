'use client';

import Tabs, { TabPanel } from '@/components/ui/tabs';
import LoadingStatus from '@/components/ui/loading-status';
import { useState } from 'react';
import tabStyles from '@/components/ui/tabs.module.css';
import AdminStatistics from './admin-statistics';
import ExcelImportSection from './excel-import-section';
import CoordinateSection from './coordinate-section';
import DistanceSection from './distance-section';
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
        className={tabStyles.underline}
      />
      <TabPanel idPrefix="admin" value="update" selected={tab}>
        <ExcelImportSection
          busy={admin.busy}
          file={admin.file}
          onFileChange={admin.onFileChange}
          preview={admin.preview}
          message={admin.message}
          error={error}
          upload={admin.upload}
        />
        <CoordinateSection
          busy={admin.busy}
          preview={admin.coordinatePreview}
          message={admin.coordinateMessage}
          error={error}
          measure={admin.measureCoordinates}
        />
        <DistanceSection
          busy={admin.busy}
          preview={admin.distancePreview}
          message={admin.distanceMessage}
          error={error}
          measure={admin.measureDistances}
        />
      </TabPanel>
      <TabPanel idPrefix="admin" value="restaurants" selected={tab}>
        {admin.busy && <LoadingStatus label="식당 정보를 반영하는 중…" />}
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
      </TabPanel>
      <TabPanel idPrefix="admin" value="statistics" selected={tab}>
        {tab === 'statistics' && <AdminStatistics password={password} />}
      </TabPanel>
    </>
  );
}
