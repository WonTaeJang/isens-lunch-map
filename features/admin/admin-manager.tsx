'use client';

import ExcelImportSection from './excel-import-section';
import RestaurantTable from './restaurant-table';
import AddressErrorSection from './address-error-section';
import useAdminRestaurants from './use-admin-restaurants';
import type { RestaurantRow } from '@/lib/restaurant-types';

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
  const admin = useAdminRestaurants(restaurants, password, onReload);
  return (
    <>
      <ExcelImportSection
        busy={admin.busy}
        file={admin.file}
        onFileChange={admin.onFileChange}
        preview={admin.preview}
        message={admin.message}
        error={error}
        upload={admin.upload}
      />

      <RestaurantTable
        restaurants={restaurants}
        error={error}
        activeTab={admin.activeTab}
        onTabChange={admin.onTabChange}
        activeCount={admin.activeCount}
        visibleRestaurants={admin.visibleRestaurants}
        busy={admin.busy}
        toggle={admin.toggle}
      />

      <AddressErrorSection
        addressErrors={admin.addressErrors}
        addresses={admin.addresses}
        onAddressChange={admin.onAddressChange}
        addressMessage={admin.addressMessage}
        busy={admin.busy}
        error={error}
        saveAddress={admin.saveAddress}
      />
    </>
  );
}
