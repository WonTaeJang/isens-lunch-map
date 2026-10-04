export type RankedRestaurant = {
  id: string;
  name: string;
  category: string;
  latitude: string | null;
  longitude: string | null;
  reviews: number;
  rank: number;
  recommended: number;
  not_recommended: number;
};

/** Lunch ranking row: today's-lunch picks over the last LUNCH_RANKING_DAYS days. */
export type LunchRankedRestaurant = RankedRestaurant & {
  /** Days anyone picked it (one pick per person per day). */
  visits: number;
  /** Distinct people who picked it. */
  people: number;
};

// Input is ordered by review count descending. Equal counts share a competition rank.
export function withReviewRanks<T extends { reviews: number }>(rows: readonly T[]) {
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || row.reviews !== rows[index - 1].reviews) rank = index + 1;
    return { ...row, rank };
  });
}
