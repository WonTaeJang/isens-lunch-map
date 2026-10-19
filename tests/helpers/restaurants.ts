import type { Restaurant } from '../../lib/server/restaurants';

type Call = { text: string; values?: unknown[] };

/**
 * Replaces the shared DB pool with a fake client: `select id…` returns `current`, every other
 * query returns `result` (or throws for `update public…` when `fail`). Returns the recorded calls.
 */
export function mockDb(
  current: Restaurant[],
  { fail = false, result = [] }: { fail?: boolean; result?: unknown[] } = {},
) {
  const calls: Call[] = [];
  const client = {
    query: async (text: string, values?: unknown[]) => {
      calls.push({ text, values });
      if (text.startsWith('select id')) return { rows: current };
      if (fail && text.startsWith('update public')) throw new Error('injected');
      return { rows: result };
    },
    release: () => {},
  };
  (globalThis as unknown as { lunchDb: unknown }).lunchDb = { connect: async () => client };
  return calls;
}

let seq = 0;
/** A restaurant row with a fresh id and name; `overrides` set everything else. */
export function restaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  seq++;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    name: `식당 ${seq}`,
    category: null,
    main_menu: null,
    address: '주소',
    distance: null,
    active: true,
    latitude: null,
    longitude: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}
