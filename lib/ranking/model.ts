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

// Input is ordered by review count descending. Equal counts share a competition rank.
export function withReviewRanks<T extends { reviews: number }>(rows: readonly T[]) {
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || row.reviews !== rows[index - 1].reviews) rank = index + 1;
    return { ...row, rank };
  });
}
