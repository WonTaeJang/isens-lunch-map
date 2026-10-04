import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { getRestaurantRanking } from '../lib/server/ranking';

test('ranking includes only active restaurants with reviews, sorts by count and does not expose authors', async () => {
  const db = {
    query: async (sql: string, values: unknown[]) => {
      assert.match(sql, /where s.active=true/);
      assert.match(sql, /from public\.review where enabled=true\s+group by restaurant_id/);
      assert.match(sql, /\) c on c\.restaurant_id=s\.id/);
      assert.match(sql, /order by reviews desc, s.name, s.id/);
      assert.match(sql, /limit \$1/);
      assert.deepEqual(values, [10]);
      assert.doesNotMatch(sql, /user_id|user_name|content/);
      return { rows: [] };
    },
  } as unknown as Pool;
  assert.deepEqual(await getRestaurantRanking(db), []);
});

test('equal review counts share a rank and the next rank skips tied positions', async () => {
  const { withReviewRanks } = await import('../lib/ranking/model');
  const rows = [9, 9, 6, 4, 4, 4, 1].map((reviews) => ({ reviews }));
  assert.deepEqual(
    withReviewRanks(rows).map((row) => row.rank),
    [1, 1, 3, 4, 4, 4, 7],
  );
  assert.deepEqual(withReviewRanks([]), []);
  assert.deepEqual(
    withReviewRanks([{ reviews: 1 }, { reviews: 1 }]).map((row) => row.rank),
    [1, 1],
  );
  assert.equal('rank' in rows[0], false);
});

test('recommendation ranking scores all active rated restaurants before limiting and shares equal-score ranks', async () => {
  const { getRecommendationRanking } = await import('../lib/server/ranking');
  const db = {
    query: async (sql: string, values: unknown[]) => {
      assert.deepEqual(values, [10, 1.5, 5]);
      assert.match(sql, /where s.active=true/);
      assert.match(sql, /recommended \+ not_recommended > 0/);
      assert.match(sql, /recommended \* \$2::numeric \+ not_recommended \+ \$3::numeric/);
      assert.match(sql, /rank\(\) over \(order by score desc\)/);
      assert.match(sql, /order by scored.score desc, name, id limit \$1/);
      assert.equal((sql.match(/limit/g) ?? []).length, 1);
      return { rows: [] };
    },
  } as unknown as Pool;
  assert.deepEqual(await getRecommendationRanking(db), []);
});

test('admin recommendation ranking includes inactive restaurants while public ranking excludes them', async () => {
  const { recommendationRankingSql } = await import('../lib/server/ranking');
  assert.match(recommendationRankingSql(), /where s.active=true/);
  assert.doesNotMatch(recommendationRankingSql(true), /where s.active=true/);
  assert.match(recommendationRankingSql(true), /active, reviews, recommended, not_recommended/);
  assert.match(recommendationRankingSql(true), /limit \$1/);
});

test('lunch ranking counts the last 30 Korean days for active restaurants without exposing who picked', async () => {
  const { getLunchRanking } = await import('../lib/server/ranking');
  const db = {
    query: async (sql: string, values: unknown[]) => {
      assert.deepEqual(values, [10, 30]);
      assert.match(sql, /visit_date > \(now\(\) at time zone 'Asia\/Seoul'\)::date - \$2::int/);
      assert.match(sql, /count\(distinct user_id\)::int people/);
      assert.match(sql, /s\.active=true/);
      assert.match(sql, /where enabled=true/);
      assert.match(sql, /rank\(\) over \(order by v\.visits desc, v\.people desc\)/);
      assert.match(sql, /limit \$1/);
      assert.doesNotMatch(sql, /user_name/);
      return { rows: [] };
    },
  } as unknown as Pool;
  assert.deepEqual(await getLunchRanking(db), []);
});

test('admin lunch ranking includes inactive restaurants and takes its own parameter numbers', async () => {
  const { lunchRankingSql } = await import('../lib/server/ranking');
  assert.match(lunchRankingSql(), /s\.active=true/);
  assert.doesNotMatch(lunchRankingSql(true), /active=true/);
  const admin = lunchRankingSql(true, { limit: '$1', days: '$4' });
  assert.match(admin, /- \$4::int/);
  assert.match(admin, /limit \$1/);
});
