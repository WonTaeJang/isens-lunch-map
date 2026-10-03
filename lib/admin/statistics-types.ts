export type AdminStatistics = {
  users: number;
  reviews: number;
  activeRestaurants: number;
  reviewedRestaurants: number;
  recommended: number;
  notRecommended: number;
  recentDays: { date: string; count: number }[];
  topRestaurants: { id: string; name: string; active: boolean | null; count: number }[];
  topRecommendedRestaurants: {
    id: string;
    name: string;
    rank: number;
    score: number;
    active: boolean | null;
    recommended: number;
    not_recommended: number;
  }[];
  tags: { value: string; label: string; count: number }[];
};
