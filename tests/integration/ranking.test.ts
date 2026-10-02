import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { getRestaurantRanking, getRecommendationRanking } from '../../lib/server/ranking';

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
      await db.query('create table public.review (restaurant_id uuid, is_recommended boolean)');
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
      assert.ok(reviewRanking.every((row) => row.name !== 'inactive' && row.name !== 'empty'));
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
