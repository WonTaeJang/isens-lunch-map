import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GET } from '../app/api/reviews/route';
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
