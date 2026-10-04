import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import {
  cancelTodayVisit,
  getTodayVisit,
  listUserVisits,
  setTodayVisit,
} from '../../lib/server/lunch-visits';

// Only an explicitly configured test DB is used; production tables are never touched.
const connectionString = process.env.REVIEW_TEST_DATABASE_URL;
test(
  'PostgreSQL: one lunch per Korean day, replace, cancel, history and concurrent checks',
  { skip: !connectionString },
  async () => {
    const pool = new Pool({ connectionString, max: 4 });
    const schema = `lunch_visit_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const db = {
      query: (sql: string, values?: unknown[]) =>
        pool.query(
          sql
            .replaceAll('public.lunch_visit', `"${schema}".lunch_visit`)
            .replaceAll('public.restaurants', `"${schema}".restaurants`),
          values,
        ),
    } as unknown as Pool;
    const user = crypto.randomUUID();
    const [first, second, inactive] = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ];
    try {
      await pool.query(`create schema "${schema}"`);
      await db.query(
        'create table public.restaurants (id uuid primary key, name text, active boolean)',
      );
      // Same definition as the production table.
      await db.query(`create table public.lunch_visit (
        id            uuid primary key default gen_random_uuid(),
        user_id       uuid not null,
        user_name     text,
        restaurant_id uuid not null references public.restaurants(id) on delete restrict,
        visit_date    date not null,
        created_at    timestamptz not null default now(),
        updated_at    timestamptz,
        constraint lunch_visit_user_date_key unique (user_id, visit_date)
      )`);
      await db.query(
        "insert into public.restaurants values ($1,'첫 식당',true),($2,'둘째 식당',true),($3,'닫은 식당',false)",
        [first, second, inactive],
      );

      assert.equal(await getTodayVisit(db, user), null);
      const created = await setTodayVisit(db, { user, userName: '이름', restaurant: first });
      assert.equal(created.restaurant_name, '첫 식당');
      assert.equal(created.updated_at, null);
      const today = await pool.query("select ((now() at time zone 'Asia/Seoul')::date)::text d");
      assert.equal(created.visit_date, today.rows[0].d);

      // Same restaurant again: no change. Another restaurant: replaced in place.
      const same = await setTodayVisit(db, { user, userName: '이름', restaurant: first });
      assert.equal(same.id, created.id);
      assert.equal(same.updated_at, null);
      const changed = await setTodayVisit(db, { user, userName: '새 이름', restaurant: second });
      assert.equal(changed.id, created.id);
      assert.equal(changed.restaurant_name, '둘째 식당');
      assert.ok(changed.updated_at);
      assert.equal((await getTodayVisit(db, user))?.restaurant_id, second);

      await assert.rejects(
        setTodayVisit(db, { user, userName: '이름', restaurant: inactive }),
        (error: { status?: number }) => error.status === 404,
      );
      assert.equal((await getTodayVisit(db, user))?.restaurant_id, second);

      // Cancel, cancel again, then check again on the same day.
      assert.equal(await cancelTodayVisit(db, user), true);
      assert.equal(await cancelTodayVisit(db, user), false);
      assert.equal(await getTodayVisit(db, user), null);
      await setTodayVisit(db, { user, userName: '이름', restaurant: first });

      // Concurrent checks from two tabs still leave exactly one row for today.
      const racer = crypto.randomUUID();
      await Promise.all([
        setTodayVisit(db, { user: racer, userName: 'r', restaurant: first }),
        setTodayVisit(db, { user: racer, userName: 'r', restaurant: second }),
      ]);
      const raced = await db.query(
        'select count(*)::int n from public.lunch_visit where user_id=$1',
        [racer],
      );
      assert.equal(raced.rows[0].n, 1);

      // History: newest first, 30 per page, past days kept, other users excluded.
      for (let day = 1; day <= 31; day++)
        await db.query(
          `insert into public.lunch_visit (user_id, restaurant_id, visit_date)
          values ($1, $2, (now() at time zone 'Asia/Seoul')::date - $3::int)`,
          [user, day % 2 ? first : inactive, day],
        );
      const page = await listUserVisits(db, user);
      assert.equal(page.visits.length, 30);
      assert.equal(page.visits[0].visit_date, today.rows[0].d);
      assert.equal(page.hasMore, true);
      assert.ok(page.visits.some((visit) => visit.restaurant_active === false));
      const rest = await listUserVisits(db, user, page.nextCursor);
      assert.equal(rest.visits.length, 2);
      assert.equal(rest.hasMore, false);
      assert.equal(rest.nextCursor, null);
      assert.ok(rest.visits.every((visit) => visit.visit_date < page.nextCursor!));
    } finally {
      try {
        await pool.query(`drop schema if exists "${schema}" cascade`);
      } finally {
        await pool.end();
      }
    }
  },
);
