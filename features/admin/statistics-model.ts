export type AdminStatistics = {
  users: number;
  reviews: number;
  activeRestaurants: number;
  reviewedRestaurants: number;
  recommended: number;
  notRecommended: number;
  recentDays: { date: string; count: number }[];
  unreviewedRestaurants: { id: string; name: string }[];
  topRestaurants: { id: string; name: string; active: boolean | null; count: number }[];
  tags: { value: string; label: string; count: number }[];
};
