import 'server-only';
import type { Pool } from 'pg';
import { BlacklistError, type BlacklistedRestaurant } from '@/lib/blacklist/model';

const SELECT_ENTRIES = `select b.restaurant_id, s.name restaurant_name,
  s.category restaurant_category, s.active restaurant_active, b.created_at
  from public.restaurant_blacklist b join public.restaurants s on s.id=b.restaurant_id`;

type BlacklistRow = Omit<BlacklistedRestaurant, 'created_at'> & { created_at: Date | string };
function present(row: BlacklistRow): BlacklistedRestaurant {
  return { ...row, created_at: new Date(row.created_at).toISOString() };
}

/** The user's hidden restaurants, newest first (deactivated restaurants included). */
export async function listBlacklist(db: Pool, user: string): Promise<BlacklistedRestaurant[]> {
  const { rows } = await db.query<BlacklistRow>(
    `${SELECT_ENTRIES}
    where b.user_id=$1
    order by b.created_at desc, b.restaurant_id`,
    [user],
  );
  return rows.map(present);
}

/** Only the ids of the user's hidden restaurants, for filtering a page on the server. */
export async function listBlacklistIds(db: Pool, user: string): Promise<string[]> {
  const { rows } = await db.query<{ restaurant_id: string }>(
    'select restaurant_id from public.restaurant_blacklist where user_id=$1',
    [user],
  );
  return rows.map((row) => row.restaurant_id);
}

/**
 * Hides an active restaurant for the user. Adding it again changes nothing (the primary key
 * (user_id, restaurant_id) keeps one row), so a double click or a second tab is harmless.
 */
export async function addToBlacklist(
  db: Pool,
  user: string,
  restaurant: string,
): Promise<BlacklistedRestaurant> {
  await db.query(
    `insert into public.restaurant_blacklist (user_id, restaurant_id)
    select $1, id from public.restaurants where id=$2 and active=true
    on conflict do nothing`,
    [user, restaurant],
  );
  const { rows } = await db.query<BlacklistRow>(
    `${SELECT_ENTRIES}
    where b.user_id=$1 and b.restaurant_id=$2`,
    [user, restaurant],
  );
  if (!rows[0]) throw new BlacklistError('숨길 수 없는 식당이에요.', 404);
  return present(rows[0]);
}

/** Shows the restaurant again. Returns false when it was not hidden (repeating is harmless). */
export async function removeFromBlacklist(
  db: Pool,
  user: string,
  restaurant: string,
): Promise<boolean> {
  const result = await db.query(
    'delete from public.restaurant_blacklist where user_id=$1 and restaurant_id=$2',
    [user, restaurant],
  );
  return Boolean(result.rowCount);
}
