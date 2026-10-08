import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET, POST, PATCH, DELETE } from '../app/api/reviews/route';
const id = '11111111-1111-4111-8111-111111111111';
test('review routes reject invalid cursors, obsolete offsets and missing owners before DB access', async () => {
  for (const query of [
    'cursor=broken',
    `restaurant_id=${id}&offset=20`,
    `scope=review&review_id=${id}`,
    'scope=mine',
  ]) {
    const response = await GET(new Request(`http://localhost/api/reviews?${query}`));
    assert.equal(response.status, 400);
  }
});
test('conflict lookup is owner-scoped, private and returns explicit null for deleted review', async () => {
  const globalDb = globalThis as unknown as { lunchDb: unknown };
  const previous = globalDb.lunchDb;
  globalDb.lunchDb = {
    query: async (sql: string, values: unknown[]) => {
      assert.match(sql, /where id=\$1 and user_id=\$2/);
      assert.deepEqual(values, [id, id]);
      return { rows: [] };
    },
  };
  try {
    const response = await GET(
      new Request(`http://localhost/api/reviews?scope=review&review_id=${id}&user_id=${id}`),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.deepEqual(await response.json(), { review: null });
  } finally {
    globalDb.lunchDb = previous;
  }
});

test('writes return the saved vote only after commit; limit and snapshot failures roll back', async () => {
  const globalDb = globalThis as unknown as { lunchDb: unknown };
  const previous = globalDb.lunchDb;
  const mine = {
    id,
    user_name: 'tester',
    content: '',
    is_recommended: true,
    tags: [],
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: null,
    is_mine: true,
  };
  try {
    for (const [method, handler] of [
      ['POST', POST],
      ['PATCH', PATCH],
      ['DELETE', DELETE],
    ] as const) {
      for (const scenario of [
        'success',
        'snapshot-failure',
        ...(method === 'POST' ? ['limit'] : []),
      ]) {
        const calls: string[] = [];
        const query = async (sql: string) => {
          calls.push(sql);
          if (sql.includes('row_to_json(own_review)')) {
            if (scenario === 'snapshot-failure') throw new Error('snapshot failed');
            return {
              rows: [
                {
                  recommended: method === 'DELETE' ? 0 : 1,
                  not_recommended: 0,
                  mine: method === 'DELETE' ? null : mine,
                },
              ],
              rowCount: 1,
            };
          }
          if (sql.includes('select count(*)'))
            return { rows: [{ count: scenario === 'limit' ? 5 : 0 }], rowCount: 1 };
          if (sql.includes('select id from public.review')) return { rows: [], rowCount: 0 };
          return { rows: [{ restaurant_id: id }], rowCount: 1 };
        };
        globalDb.lunchDb = { connect: async () => ({ query, release() {} }) };
        const response = await handler(
          new Request('http://localhost/api/reviews', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurant_id: id,
              user_id: id,
              id,
              version: mine.created_at,
              user_name: 'tester',
              content: '',
              tags: [],
              is_recommended: true,
            }),
          }),
        );
        if (scenario === 'success') {
          assert.equal(response.status, method === 'POST' ? 201 : 200);
          assert.deepEqual(await response.json(), {
            ok: true,
            restaurant_id: id,
            recommended: method === 'DELETE' ? 0 : 1,
            not_recommended: 0,
            mine: method === 'DELETE' ? null : mine,
          });
          assert.equal(calls.at(-1), 'commit');
        } else {
          assert.equal(response.status, scenario === 'limit' ? 429 : 500);
          assert.equal(calls.at(-1), 'rollback');
          assert.ok(!calls.includes('commit'));
        }
      }
    }
  } finally {
    globalDb.lunchDb = previous;
  }
});
