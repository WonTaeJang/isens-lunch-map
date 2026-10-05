import 'server-only';
import type { Pool } from 'pg';
import { LunchVisitError, type LunchVisit } from '@/lib/lunch-visits/model';

// The visit date is always decided by the server in Korean time, never by the browser.
const TODAY = "(now() at time zone 'Asia/Seoul')::date";
const FIELDS = `v.id, v.restaurant_id, s.name restaurant_name, s.category restaurant_category,
  s.active restaurant_active,
  v.visit_date::text visit_date, v.created_at, v.updated_at`;

type VisitRow = Omit<LunchVisit, 'created_at' | 'updated_at'> & {
  created_at: Date | string;
  updated_at: Date | string | null;
};
function present(row: VisitRow): LunchVisit {
  return {
    id: row.id,
    restaurant_id: row.restaurant_id,
    restaurant_name: row.restaurant_name,
    restaurant_category: row.restaurant_category,
    restaurant_active: row.restaurant_active,
    visit_date: row.visit_date,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: row.updated_at === null ? null : new Date(row.updated_at).toISOString(),
  };
}

export async function getTodayVisit(db: Pool, user: string): Promise<LunchVisit | null> {
  const { rows } = await db.query<VisitRow>(
    `select ${FIELDS}
    from public.lunch_visit v join public.restaurants s on s.id = v.restaurant_id
    where v.user_id = $1 and v.visit_date = ${TODAY}`,
    [user],
  );
  return rows[0] ? present(rows[0]) : null;
}

/** Records today's lunch. One per user per day: checking another restaurant replaces it. */
export async function setTodayVisit(
  db: Pool,
  input: { user: string; userName: string; restaurant: string },
): Promise<LunchVisit> {
  const { rows } = await db.query<VisitRow>(
    `with saved as (
      insert into public.lunch_visit as v (user_id, user_name, restaurant_id, visit_date)
      select $1, $2, s.id, ${TODAY}
      from public.restaurants s
      where s.id = $3 and s.active = true
      on conflict (user_id, visit_date) do update
        set restaurant_id = excluded.restaurant_id,
            user_name = excluded.user_name,
            updated_at = case
              when v.restaurant_id is distinct from excluded.restaurant_id then now()
              else v.updated_at
            end
      returning v.*
    )
    select ${FIELDS}
    from saved v join public.restaurants s on s.id = v.restaurant_id`,
    [input.user, input.userName, input.restaurant],
  );
  if (!rows[0]) throw new LunchVisitError('지금은 오늘의 점심으로 고를 수 없는 식당이에요.', 404);
  return present(rows[0]);
}

/** Cancels today's record only. Returns false when there was nothing to cancel. */
export async function cancelTodayVisit(db: Pool, user: string): Promise<boolean> {
  const result = await db.query(
    `delete from public.lunch_visit where user_id = $1 and visit_date = ${TODAY}`,
    [user],
  );
  return Boolean(result.rowCount);
}

/** Every visit in one month (YYYY-MM), oldest first. At most one per day, so at most 31 rows. */
export async function listMonthVisits(
  db: Pool,
  user: string,
  month: string,
): Promise<LunchVisit[]> {
  const { rows } = await db.query<VisitRow>(
    `select ${FIELDS}
    from public.lunch_visit v join public.restaurants s on s.id = v.restaurant_id
    where v.user_id = $1
      and v.visit_date >= $2::date
      and v.visit_date < ($2::date + interval '1 month')
    order by v.visit_date`,
    [user, `${month}-01`],
  );
  return rows.map(present);
}
