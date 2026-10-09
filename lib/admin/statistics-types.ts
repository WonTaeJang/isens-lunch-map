export type AdminStatistics = {
  users: number;
  reviews: number;
  activeRestaurants: number;
  /** Active restaurants with at least one review. */
  reviewedRestaurants: number;
  /** Active restaurants picked as 오늘의 점심 at least once (any day, by anyone). */
  lunchedRestaurants: number;
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
  /** Today's-lunch picks over the last LUNCH_RANKING_DAYS days, inactive restaurants included. */
  topLunchRestaurants: {
    id: string;
    name: string;
    active: boolean | null;
    visits: number;
    people: number;
    rank: number;
  }[];
  tags: { value: string; label: string; count: number }[];
};
