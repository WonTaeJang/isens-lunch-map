import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELETE, GET, POST } from '../app/api/blacklist/route';
import { BlacklistError, blacklistUuid } from '../lib/blacklist/model';
import { listBlacklistIds } from '../lib/server/blacklist';

const user = '11111111-1111-4111-8111-111111111111';
const restaurant = '22222222-2222-4222-8222-222222222222';
const row = {
  restaurant_id: restaurant,
  restaurant_name: '식당',
  restaurant_category: '한식',
  restaurant_active: true,
  created_at: new Date('2026-10-10T03:00:00Z'),
};

type Query = (sql: string, values: unknown[]) => { rows: object[]; rowCount?: number };
async function withDb(
  query: Query,
  run: (calls: { sql: string; values: unknown[] }[]) => Promise<void>,
) {
  const globalDb = globalThis as unknown as { lunchDb: unknown };
  const previous = globalDb.lunchDb;
  const calls: { sql: string; values: unknown[] }[] = [];
  globalDb.lunchDb = {
    query: async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      return query(sql, values);
    },
  };
  try {
    await run(calls);
  } finally {
    globalDb.lunchDb = previous;
  }
}
const json = (method: string, body: unknown, origin?: string) =>
  new Request('http://localhost/api/blacklist', {
    method,
    headers: { 'Content-Type': 'application/json', ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });

test('identifiers are validated and normalized', () => {
  assert.equal(blacklistUuid(user.toUpperCase()), user);
  for (const value of ['bad', '', null, 1])
    assert.throws(() => blacklistUuid(value), BlacklistError);
});

test('invalid or cross-origin requests never reach the database', async () => {
  await withDb(
    () => {
      throw new Error('unexpected query');
    },
    async (calls) => {
      assert.equal((await GET(new Request('http://localhost/api/blacklist'))).status, 400);
      assert.equal((await POST(json('POST', { user_id: user, restaurant_id: 'bad' }))).status, 400);
      assert.equal((await DELETE(json('DELETE', []))).status, 400);
      assert.equal(
        (
          await POST(
            json('POST', { user_id: user, restaurant_id: restaurant }, 'https://x.example'),
          )
        ).status,
        403,
      );
      assert.equal(calls.length, 0);
    },
  );
});

test('list is private, scoped to the user and newest first', async () => {
  await withDb(
    () => ({ rows: [row] }),
    async (calls) => {
      const response = await GET(new Request(`http://localhost/api/blacklist?user_id=${user}`));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      assert.deepEqual(await response.json(), {
        restaurants: [{ ...row, created_at: '2026-10-10T03:00:00.000Z' }],
      });
      assert.match(calls[0].sql, /where b.user_id=\$1/);
      assert.match(calls[0].sql, /order by b.created_at desc/);
      assert.deepEqual(calls[0].values, [user]);
    },
  );
});

test('adding inserts only an active restaurant, ignores a repeat and returns the entry', async () => {
  await withDb(
    (sql) => ({ rows: sql.startsWith('insert') ? [] : [row], rowCount: 0 }),
    async (calls) => {
      const response = await POST(json('POST', { user_id: user, restaurant_id: restaurant }));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).restaurant.restaurant_id, restaurant);
      assert.match(calls[0].sql, /from public.restaurants where id=\$2 and active=true/);
      assert.match(calls[0].sql, /on conflict do nothing/);
      assert.deepEqual(calls[0].values, [user, restaurant]);
    },
  );
  // Neither inserted nor already hidden: missing or inactive restaurant.
  await withDb(
    () => ({ rows: [], rowCount: 0 }),
    async () => {
      const response = await POST(json('POST', { user_id: user, restaurant_id: restaurant }));
      assert.equal(response.status, 404);
    },
  );
});

test('removing reports whether the restaurant was hidden', async () => {
  for (const rowCount of [1, 0])
    await withDb(
      () => ({ rows: [], rowCount }),
      async (calls) => {
        const response = await DELETE(json('DELETE', { user_id: user, restaurant_id: restaurant }));
        assert.deepEqual(await response.json(), { removed: rowCount === 1 });
        assert.match(
          calls[0].sql,
          /delete from public.restaurant_blacklist where user_id=\$1 and restaurant_id=\$2/,
        );
      },
    );
});

test("server pages read only the ids of the user's hidden restaurants", async () => {
  const calls: { sql: string; values: unknown[] }[] = [];
  const db = {
    query: async (sql: string, values: unknown[]) => {
      calls.push({ sql, values });
      return { rows: [{ restaurant_id: restaurant }] };
    },
  } as never;
  assert.deepEqual(await listBlacklistIds(db, user), [restaurant]);
  assert.equal(
    calls[0].sql,
    'select restaurant_id from public.restaurant_blacklist where user_id=$1',
  );
  assert.deepEqual(calls[0].values, [user]);
});
