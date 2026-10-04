import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import {
  getLunchRanking,
  lunchRankingSql,
  getRestaurantRanking,
  getRecommendationRanking,
} from '../../lib/server/ranking';

// Only an explicitly configured test DB is used; production tables are never touched.
const connectionString = process.env.REVIEW_TEST_DATABASE_URL;
test(
  'PostgreSQL: recommendation scoring, shared ranks, active filtering and top-ten limit',
  { skip: !connectionString },
  async () => {
    const pool = new Pool({ connectionString, max: 1 });
    const schema = `ranking_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const db = {
      query: (sql: string, values?: unknown[]) =>
        pool.query(
          sql
            .replaceAll('public.restaurants', `"${schema}".restaurants`)
            .replaceAll('public.review', `"${schema}".review`),
          values,
        ),
    } as unknown as Pool;
    try {
      await pool.query(`create schema "${schema}"`);
      await db.query(
        'create table public.restaurants (id uuid primary key, name text, category text, latitude text, longitude text, active boolean)',
      );
      await db.query(
        'create table public.review (restaurant_id uuid, is_recommended boolean, enabled boolean not null default true)',
      );
      assert.deepEqual(await getRecommendationRanking(db), []);
      async function seed(
        name: string,
        positive: number,
        negative: number,
        active = true,
        unrated = 0,
      ) {
        const id = crypto.randomUUID();
        await db.query('insert into public.restaurants (id, name, active) values ($1,$2,$3)', [
          id,
          name,
          active,
        ]);
        for (const [count, rating] of [
          [positive, true],
          [negative, false],
          [unrated, null],
        ] as const) {
          await db.query(
            'insert into public.review select $1::uuid,$2::boolean from generate_series(1,$3::int)',
            [id, rating, count],
          );
        }
      }
      // 20/1 = 83.33%; 5/0 and 10/5 both = 60%; 1/0 = 23.08%.
      await seed('a-best', 20, 1);
      await seed('b-tie', 5, 0);
      await seed('c-tie', 10, 5);
      await seed('d-single', 1, 0);
      await seed('inactive', 100, 0, false);
      await seed('unrated', 0, 0, true, 100);
      await seed('empty', 0, 0);
      // Deleted (enabled=false) reviews must not count toward either ranking.
      await seed('deleted', 200, 0);
      await db.query(
        "update public.review set enabled=false where restaurant_id=(select id from public.restaurants where name='deleted')",
      );
      const ranked = await getRecommendationRanking(db);
      assert.deepEqual(
        ranked.map((row) => [row.name, row.rank]),
        [
          ['a-best', 1],
          ['b-tie', 2],
          ['c-tie', 2],
          ['d-single', 4],
        ],
      );
      assert.ok(ranked.every((row) => !('score' in row)));
      const reviewRanking = await getRestaurantRanking(db);
      assert.equal(reviewRanking[0].name, 'unrated');
      assert.ok(reviewRanking.every((row) => !['inactive', 'empty', 'deleted'].includes(row.name)));
      for (let i = 0; i < 12; i++) await seed(`low-${String(i).padStart(2, '0')}`, 0, 1);
      const limited = await getRecommendationRanking(db);
      assert.equal(limited.length, 10);
      assert.ok(limited.slice(4).every((row) => row.rank === 5));
      assert.equal((await getRestaurantRanking(db)).length, 10);
    } finally {
      try {
        await pool.query(`drop schema if exists "${schema}" cascade`);
      } finally {
        await pool.end();
      }
    }
  },
);

test(
  'PostgreSQL: lunch ranking counts the last 30 Korean days, ties by people, active only',
  { skip: !connectionString },
  async () => {
    const pool = new Pool({ connectionString, max: 1 });
    const schema = `lunch_ranking_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const db = {
      query: (sql: string, values?: unknown[]) =>
        pool.query(
          sql
            .replaceAll('public.restaurants', `"${schema}".restaurants`)
            .replaceAll('public.review', `"${schema}".review`)
            .replaceAll('public.lunch_visit', `"${schema}".lunch_visit`),
          values,
        ),
    } as unknown as Pool;
    try {
      await pool.query(`create schema "${schema}"`);
      await db.query(
        'create table public.restaurants (id uuid primary key, name text, category text, latitude text, longitude text, active boolean)',
      );
      await db.query(
        'create table public.review (restaurant_id uuid, is_recommended boolean, enabled boolean not null default true)',
      );
      await db.query(
        'create table public.lunch_visit (user_id uuid, restaurant_id uuid, visit_date date, unique (user_id, visit_date))',
      );
      assert.deepEqual(await getLunchRanking(db), []);
      const ids: Record<string, string> = {};
      for (const [name, active] of [
        ['many', true],
        ['crowd', true],
        ['regular', true],
        ['old', true],
        ['closed', false],
      ] as const) {
        ids[name] = crypto.randomUUID();
        await db.query('insert into public.restaurants (id, name, active) values ($1,$2,$3)', [
          ids[name],
          name,
          active,
        ]);
      }
      const [a, b, c] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
      // daysAgo 0 is today (KST); 29 is the oldest day inside the window, 30 is outside.
      const visits: [string, string, number][] = [
        [a, 'many', 0],
        [a, 'many', 1],
        [a, 'many', 2],
        [b, 'crowd', 0],
        [c, 'crowd', 1],
        [a, 'regular', 3],
        [a, 'regular', 29],
        [b, 'old', 30],
        [b, 'old', 31],
        [c, 'closed', 2],
        [c, 'closed', 3],
        [c, 'closed', 4],
        [c, 'closed', 5],
      ];
      for (const [user, name, daysAgo] of visits)
        await db.query(
          `insert into public.lunch_visit values ($1, $2, (now() at time zone 'Asia/Seoul')::date - $3::int)`,
          [user, ids[name], daysAgo],
        );
      await db.query('insert into public.review values ($1, true), ($1, false), ($1, null)', [
        ids.many,
      ]);
      const ranked = await getLunchRanking(db);
      assert.deepEqual(
        ranked.map((row) => [row.name, row.visits, row.people, row.rank]),
        [
          ['many', 3, 1, 1],
          ['crowd', 2, 2, 2],
          ['regular', 2, 1, 3],
        ],
      );
      assert.deepEqual(
        [ranked[0].reviews, ranked[0].recommended, ranked[0].not_recommended],
        [3, 1, 1],
      );
      assert.deepEqual([ranked[1].reviews, ranked[1].recommended], [0, 0]);
      assert.ok(ranked.every((row) => !('user_id' in row) && !('last_visit' in row)));
      // Admin statistics also count inactive restaurants.
      const admin = await db.query(lunchRankingSql(true), [10, 30]);
      assert.deepEqual(
        admin.rows.map((row) => [row.name, row.visits, row.rank, row.active]),
        [
          ['closed', 4, 1, false],
          ['many', 3, 2, true],
          ['crowd', 2, 3, true],
          ['regular', 2, 4, true],
        ],
      );
    } finally {
      try {
        await pool.query(`drop schema if exists "${schema}" cascade`);
      } finally {
        await pool.end();
      }
    }
  },
);
