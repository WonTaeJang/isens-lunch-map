import type { MapRestaurant } from '@/lib/restaurant-types';

// Input is the filtered active restaurant list supplied by LunchExplorer.
export function pickRestaurant(rows: readonly MapRestaurant[], previousId?: string) {
  const candidates = rows.length > 1 ? rows.filter((row) => row.id !== previousId) : rows;
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** The slot reel: the winner sits at WINNER_INDEX, with one more name below it. */
export const WINNER_INDEX = 25;
export const SLOT_LENGTH = WINNER_INDEX + 2;

function shuffled<T>(items: readonly T[], random: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Names on the slot reel. The other candidates fill the rest in a shuffled order, so with
 * SLOT_LENGTH or more candidates no restaurant appears twice and the winner shows only where it
 * stops. With fewer, the shuffled order repeats from the start (never the same name twice in a
 * row when there are at least two others).
 */
export function createSlotNames(
  candidates: readonly MapRestaurant[],
  chosen: MapRestaurant,
  random: () => number = Math.random,
) {
  const others = shuffled(
    candidates.filter((row) => row.id !== chosen.id),
    random,
  );
  let next = 0;
  return Array.from({ length: SLOT_LENGTH }, (_, index) =>
    index === WINNER_INDEX || !others.length ? chosen.name : others[next++ % others.length].name,
  );
}
