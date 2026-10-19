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
