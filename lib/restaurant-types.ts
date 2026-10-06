export type Restaurant = {
  id: string;
  name: string;
  category: string | null;
  main_menu: string | null;
  address: string | null;
  distance: string | null;
  active: boolean | null;
  latitude: string | null;
  longitude: string | null;
  created_at: Date | null;
  updated_at: Date | null;
};

export type RestaurantRow = Omit<Restaurant, 'created_at' | 'updated_at'>;
export type MapRestaurant = Omit<RestaurantRow, 'active'>;
export type DistanceChange = {
  id: string;
  name: string;
  active: boolean;
  /** Stored meters; null when empty. */
  before: number | null;
  /** Recomputed meters; null when the restaurant has no valid coordinates. */
  after: number | null;
};
export type DistancePreview = {
  rows: DistanceChange[];
  summary: { total: number; changed: number; missingCoordinates: number };
  revision: string;
};
export type ImportSummary = { added: number; updated: number; inactive: number; missing: number };
export type ImportPreview = {
  rows: {
    key: string;
    name: string;
    address: string | null;
    active: boolean;
    row: number | null;
    changes: string[];
  }[];
  summary: ImportSummary;
  revision: string;
  token: string;
};
