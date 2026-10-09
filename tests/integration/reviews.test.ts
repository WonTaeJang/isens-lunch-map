import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { listReviews, listUserReviews, mutateReview, getOwnReview } from '../../lib/server/reviews';
import { decodeReviewCursor } from '../../lib/server/review-cursor';

// Never use DATABASE_URL or production tables. An explicitly supplied test database
// receives a disposable schema, and all application queries are scoped to it.
const connectionString = process.env.REVIEW_TEST_DATABASE_URL;
test(
  'PostgreSQL: cursor stability, microseconds, aggregates and concurrent writes',
  { skip: !connectionString },
  async () => {
    const pool = new Pool({ connectionString, max: 4 });
    const schema = `review_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const scoped = (sql: string) =>
      sql
        .replaceAll('public.review', `"${schema}".review`)
        .replaceAll('public.restaurants', `"${schema}".restaurants`)
        .replaceAll('public.lunch_visit', `"${schema}".lunch_visit`);
    const db = {
      query: (sql: string, values?: unknown[]) => pool.query(scoped(sql), values),
      connect: async () => {
        const client = await pool.connect();
        return {
          query: (sql: string, values?: unknown[]) => client.query(scoped(sql), values),
          release: () => client.release(),
        };
      },
    } as unknown as Pool;
    const user = crypto.randomUUID();
    const restaurant = crypto.randomUUID();
    const inactive = crypto.randomUUID();
    const nullRated = crypto.randomUUID();
    try {
      await pool.query(`create schema "${schema}"`);
      await db.query(
        `create table public.restaurants (id uuid primary key, name text, active boolean, latitude text, longitude text)`,
      );
      await db.query(`create table public.review (id uuid primary key default gen_random_uuid(), restaurant_id uuid references public.restaurants(id),
      user_id uuid, user_name text, content text, is_recommended boolean, tags text, created_at timestamptz not null default clock_timestamp(), updated_at timestamptz,
      enabled boolean not null default true)`);
      await db.query(`create table public.lunch_visit (id uuid primary key default gen_random_uuid(),
      user_id uuid not null, user_name text, restaurant_id uuid not null references public.restaurants(id),
      visit_date date not null, unique (user_id, visit_date))`);
      await db.query(
        "insert into public.restaurants(id,name,active) values ($1,'active',true),($2,'inactive',false),($3,'unrated',true)",
        [restaurant, inactive, nullRated],
      );
      for (let index = 0; index < 45; index++) {
        await db.query(
          `insert into public.review(restaurant_id,user_id,user_name,content,is_recommended,created_at)
        values ($1,$2,'visitor',$3,$4,'2026-10-01T01:00:00Z'::timestamptz + $5 * interval '1 microsecond')`,
          [restaurant, user, String(index), index % 2 === 0, index],
        );
      }
      const first = await listReviews(db, restaurant, user);
      assert.equal(first.reviews.length, 20);
      assert.equal(first.reviews[0].content, '44');
      assert.ok(decodeReviewCursor(first.nextCursor)?.createdAt.endsWith('000025Z'));
      await db.query('delete from public.review where id=$1', [first.reviews[0].id]);
      await db.query(
        `insert into public.review(restaurant_id,user_id,content,is_recommended) values ($1,$2,'new',false)`,
        [restaurant, user],
      );
      const second = await listReviews(db, restaurant, user, decodeReviewCursor(first.nextCursor));
      assert.equal(second.reviews[0].content, '24');
      assert.equal(second.reviews.at(-1)?.content, '5');
      const third = await listReviews(db, restaurant, user, decodeReviewCursor(second.nextCursor));
      assert.deepEqual(
        third.reviews.map((row) => row.content),
        ['4', '3', '2', '1', '0'],
      );
      assert.equal(third.nextCursor, null);
      await db.query(
        `insert into public.review(restaurant_id,user_id,content,is_recommended) values ($1,$3,'inactive',true),($2,$3,'unrated',null)`,
        [inactive, nullRated, user],
      );
      const stats = await listUserReviews(db, user);
      assert.equal(stats.active_total, 2);
      assert.equal(stats.reviewed_active, 2);
      assert.equal(stats.recommended_active, 0);
      assert.equal(stats.not_recommended_active, 1);
      assert.equal(stats.lunched_active, 0);
      assert.equal(stats.visited_active, 2);
      // 오늘의 점심 picks add to the progress: a reviewed restaurant counts once, an inactive one
      // never, and a restaurant only picked for lunch counts too.
      const lunchOnly = crypto.randomUUID();
      await db.query("insert into public.restaurants(id,name,active) values ($1,'lunch',true)", [
        lunchOnly,
      ]);
      await db.query(
        `insert into public.lunch_visit(user_id,restaurant_id,visit_date)
        values ($1,$2,'2026-10-01'),($1,$2,'2026-10-02'),($1,$3,'2026-10-03'),($1,$4,'2026-10-04')`,
        [user, restaurant, inactive, lunchOnly],
      );
      const withLunch = await listUserReviews(db, user);
      assert.equal(withLunch.active_total, 3);
      assert.equal(withLunch.reviewed_active, 2);
      assert.equal(withLunch.lunched_active, 2);
      assert.equal(withLunch.visited_active, 3);
      // The advisory lock allows exactly one concurrent first review per user/restaurant.
      const newUser = crypto.randomUUID();
      const input = {
        restaurant_id: restaurant,
        user_id: newUser,
        user_name: 'test',
        content: 'concurrent',
        is_recommended: true,
        tags: [],
      };
      const submissions = await Promise.allSettled([
        mutateReview(db, 'POST', input),
        mutateReview(db, 'POST', input),
      ]);
      assert.equal(submissions.filter((result) => result.status === 'fulfilled').length, 1);
      await db.query(
        "update public.review set created_at='2026-10-01T00:00:00Z' where user_id=$1",
        [newUser],
      );
      const mine = (await listReviews(db, restaurant, newUser)).mine!;
      const edit = { ...input, id: mine.id, version: mine.updated_at ?? mine.created_at };
      await mutateReview(db, 'PATCH', { ...edit, content: 'updated' });
      await assert.rejects(mutateReview(db, 'PATCH', edit));
      assert.equal((await getOwnReview(db, mine.id, newUser))?.content, 'updated');

      // Deleting is logical: the row and its content stay, but every read hides it.
      const updated = (await getOwnReview(db, mine.id, newUser))!;
      await mutateReview(db, 'DELETE', {
        ...input,
        id: mine.id,
        version: updated.updated_at ?? updated.created_at,
      });
      assert.equal(await getOwnReview(db, mine.id, newUser), null);
      assert.equal((await listReviews(db, restaurant, newUser)).mine, null);
      const kept = await db.query('select content, enabled from public.review where id=$1', [
        mine.id,
      ]);
      assert.deepEqual(kept.rows[0], { content: 'updated', enabled: false });
      await assert.rejects(
        mutateReview(db, 'PATCH', { ...edit, version: updated.updated_at, content: 'again' }),
      );
      // The same restaurant can be reviewed again after deleting.
      await mutateReview(db, 'POST', { ...input, content: 'rewritten' });
      assert.equal((await listReviews(db, restaurant, newUser)).mine?.content, 'rewritten');

      // Daily limit: five reviews per Korean calendar day, deleted ones included,
      // yesterday's reviews excluded, and concurrent requests cannot exceed it.
      const limited = crypto.randomUUID();
      const places = Array.from({ length: 7 }, () => crypto.randomUUID());
      for (const place of places)
        await db.query("insert into public.restaurants(id,name,active) values ($1,'p',true)", [
          place,
        ]);
      const write = (place: string) =>
        mutateReview(db, 'POST', { ...input, user_id: limited, restaurant_id: place });
      await db.query(
        `insert into public.review(restaurant_id,user_id,content,is_recommended,created_at)
        values ($1,$2,'yesterday',true,
          ((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul') - interval '1 second')`,
        [places[6], limited],
      );
      for (const place of places.slice(0, 3)) await write(place);
      const deleted = (await listReviews(db, places[0], limited)).mine!;
      await mutateReview(db, 'DELETE', {
        ...input,
        user_id: limited,
        id: deleted.id,
        version: deleted.created_at,
      });
      await write(places[3]);
      // A recommendation without content is removed for real and frees its daily slot.
      await mutateReview(db, 'POST', {
        ...input,
        user_id: limited,
        restaurant_id: places[4],
        content: '',
      });
      const vote = (await listReviews(db, places[4], limited)).mine!;
      await mutateReview(db, 'DELETE', {
        ...input,
        user_id: limited,
        id: vote.id,
        version: vote.created_at,
      });
      const gone = await db.query('select id from public.review where id=$1', [vote.id]);
      assert.equal(gone.rowCount, 0);
      const racing = await Promise.allSettled([write(places[4]), write(places[5])]);
      assert.equal(racing.filter((result) => result.status === 'fulfilled').length, 1);
      const rejected = racing.find((result) => result.status === 'rejected');
      assert.equal((rejected as PromiseRejectedResult).reason.status, 429);
      const today = await db.query(
        `select count(*)::int count from public.review where user_id=$1
        and created_at >= ((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')`,
        [limited],
      );
      assert.equal(today.rows[0].count, 5);
    } finally {
      await pool.query(`drop schema if exists "${schema}" cascade`);
      await pool.end();
    }
  },
);
