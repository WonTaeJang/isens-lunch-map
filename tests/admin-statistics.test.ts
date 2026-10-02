import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { getAdminStatistics } from '../lib/server/admin-statistics';
import type { AdminStatistics } from '../features/admin/statistics-model';
import {
  RANKING_LIMIT,
  RECOMMENDATION_WEIGHT,
  RECOMMENDATION_SMOOTHING,
} from '../features/ranking/constants';

test('statistics uses distinct authors, active restaurant coverage and counts tags once per review', async () => {
  let calls = 0;
  const topRecommendedRestaurants: AdminStatistics['topRecommendedRestaurants'] = [
    {
      id: 'best',
      name: '추천 식당',
      rank: 1,
      score: 60,
      active: false,
      recommended: 10,
      not_recommended: 5,
    },
    {
      id: 'active',
      name: '활성 식당',
      rank: 1,
      score: 60,
      active: true,
      recommended: 5,
      not_recommended: 0,
    },
  ];
  const db = {
    query: async (sql: string, values: unknown[]) => {
      calls++;
      assert.match(sql, /count\(distinct user_id\)/);
      assert.match(sql, /s.active=true/);
      assert.match(sql, /exists \(select 1 from public.review/);
      assert.match(sql, /group by tags/);
      assert.match(sql, /generate_series\(0, 6\)/);
      assert.match(sql, /Asia\/Seoul/);
      assert.match(sql, /from days left join daily using \(review_date\)/);
      assert.match(sql, /coalesce\(daily.count, 0\)/);
      assert.match(sql, /order by count desc, s.name, s.id limit \$1/);
      assert.deepEqual(values, [RANKING_LIMIT, RECOMMENDATION_WEIGHT, RECOMMENDATION_SMOOTHING]);
      assert.match(
        sql,
        /from \(select id, name, rank, score, active, recommended, not_recommended\s+from/,
      );
      return {
        rows: [
          {
            users: 2,
            reviews: 4,
            activeRestaurants: 3,
            reviewedRestaurants: 2,
            recommended: 2,
            notRecommended: 1,
            recentDays: [{ date: '2026-10-01', count: 4 }],
            topRestaurants: [{ id: 'top', name: '인기 식당', active: false, count: 4 }],
            topRecommendedRestaurants,
            tagGroups: [
              { tags: '["tasty","tasty","waiting"]', count: 2 },
              { tags: '["tasty","unknown"]', count: 1 },
              { tags: 'invalid', count: 1 },
            ],
          },
        ],
      };
    },
  } as unknown as Pool;
  const result = await getAdminStatistics(db);
  assert.equal(calls, 1);
  assert.equal(result.tags[0].value, 'tasty');
  assert.equal(result.tags[0].count, 3);
  assert.equal(result.tags.find((tag) => tag.value === 'waiting')?.count, 2);
  assert.equal(result.tags.find((tag) => tag.value === 'clean_place')?.count, 0);
  assert.equal(
    result.tags.some((tag) => tag.value === 'unknown'),
    false,
  );
  assert.equal('tagGroups' in result, false);
  assert.equal(result.recentDays[0].count, 4);
  assert.equal(result.topRestaurants[0].active, false);
  assert.deepEqual(result.topRecommendedRestaurants, topRecommendedRestaurants);
});

test('empty statistics includes zero counts for all supported tags', async () => {
  const db = {
    query: async () => ({
      rows: [
        {
          users: 0,
          reviews: 0,
          activeRestaurants: 0,
          reviewedRestaurants: 0,
          recommended: 0,
          notRecommended: 0,
          recentDays: [],
          topRestaurants: [],
          topRecommendedRestaurants: [],
          tagGroups: [],
        },
      ],
    }),
  } as unknown as Pool;
  const result = await getAdminStatistics(db);
  assert.ok(result.tags.length > 0);
  assert.ok(result.tags.every((tag) => tag.count === 0));
});

test('statistics endpoint rejects unauthenticated requests before database access', async () => {
  const { GET } = await import('../app/api/admin/statistics/route');
  const response = await GET(new Request('http://localhost/api/admin/statistics'));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('statistics client forwards authentication and abort signal and surfaces errors', async () => {
  const { loadAdminStatistics } = await import('../features/admin/admin-api');
  const previous = globalThis.fetch;
  const controller = new AbortController();
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/admin/statistics');
      assert.equal(new Headers(init?.headers).get('x-admin-password'), 'test-password');
      assert.equal(init?.cache, 'no-store');
      assert.equal(init?.signal, controller.signal);
      return Response.json({ error: '통계 조회 실패' }, { status: 500 });
    };
    await assert.rejects(loadAdminStatistics('test-password', controller.signal), /통계 조회 실패/);
  } finally {
    globalThis.fetch = previous;
  }
});
