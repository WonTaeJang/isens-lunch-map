import type { MapRestaurant } from '@/lib/restaurant-types';

/**
 * Up to `count` different restaurants in random order, shared by both games. The last result
 * (`previousId`) is left out so drawing again always changes, unless it is the only candidate.
 */
export function drawRestaurants(
  rows: readonly MapRestaurant[],
  count: number,
  previousId?: string,
  random: () => number = Math.random,
) {
  const pool = rows.length > 1 ? rows.filter((row) => row.id !== previousId) : [...rows];
  const chosen: MapRestaurant[] = [];
  while (pool.length && chosen.length < count)
    chosen.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return chosen;
}

/** The slot's pick from the game candidates, or null when there are none. */
export function pickRestaurant(rows: readonly MapRestaurant[], previousId?: string) {
  return drawRestaurants(rows, 1, previousId)[0] ?? null;
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
