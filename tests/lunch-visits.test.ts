import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELETE, GET, PUT } from '../app/api/lunch-visits/route';
import {
  koreanToday,
  LunchVisitError,
  todayLunchAction,
  visitCursor,
  visitUserName,
  visitUuid,
} from '../lib/lunch-visits/model';

const user = '11111111-1111-4111-8111-111111111111';
const restaurant = '22222222-2222-4222-8222-222222222222';
const row = {
  id: '33333333-3333-4333-8333-333333333333',
  restaurant_id: restaurant,
  restaurant_name: '식당',
  restaurant_active: true,
  visit_date: '2026-10-04',
  created_at: new Date('2026-10-04T02:00:00Z'),
  updated_at: null,
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
const json = (method: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/lunch-visits', {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

test('input validation accepts UUIDs, 1-60 char names and YYYY-MM-DD cursors only', () => {
  assert.equal(visitUuid(user.toUpperCase()), user);
  assert.equal(visitUserName('  즐거운만두#0123 '), '즐거운만두#0123');
  assert.equal(visitCursor(null), null);
  assert.equal(visitCursor('2026-10-03'), '2026-10-03');
  for (const fail of [
    () => visitUuid('nope'),
    () => visitUuid(undefined),
    () => visitUserName('   '),
    () => visitUserName('가'.repeat(61)),
    () => visitCursor('2026-13-45'),
    () => visitCursor('yesterday'),
  ])
    assert.throws(fail, LunchVisitError);
});

test('invalid requests are rejected before any DB access', async () => {
  await withDb(
    () => {
      throw new Error('unexpected query');
    },
    async (calls) => {
      for (const query of ['', 'user_id=bad', `user_id=${user}&scope=history&cursor=broken`]) {
        const response = await GET(new Request(`http://localhost/api/lunch-visits?${query}`));
        assert.equal(response.status, 400);
      }
      const bad = [
        json('PUT', '{broken'),
        json('PUT', []),
        json('PUT', { user_id: user, user_name: '', restaurant_id: restaurant }),
        json('PUT', { user_id: user, user_name: '이름', restaurant_id: 'bad' }),
        json('DELETE', { user_id: 'bad' }),
      ];
      for (const request of bad)
        assert.equal((await (request.method === 'PUT' ? PUT : DELETE)(request)).status, 400);
      const foreign = json(
        'PUT',
        { user_id: user, user_name: '이름', restaurant_id: restaurant },
        {
          origin: 'https://evil.example',
        },
      );
      assert.equal((await PUT(foreign)).status, 403);
      assert.equal((await PUT(json('PUT', 'x'.repeat(4001)))).status, 413);
      assert.equal(calls.length, 0);
    },
  );
});

test("today's visit is owner-scoped, uses the Korean date and is never cached", async () => {
  await withDb(
    () => ({ rows: [row] }),
    async (calls) => {
      const response = await GET(new Request(`http://localhost/api/lunch-visits?user_id=${user}`));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      assert.deepEqual(await response.json(), {
        visit: { ...row, created_at: '2026-10-04T02:00:00.000Z' },
      });
      assert.match(
        calls[0].sql,
        /v\.user_id = \$1 and v\.visit_date = \(now\(\) at time zone 'Asia\/Seoul'\)::date/,
      );
      assert.deepEqual(calls[0].values, [user]);
    },
  );
});

test('checking upserts one visit per day for active restaurants only', async () => {
  await withDb(
    () => ({ rows: [row] }),
    async (calls) => {
      const response = await PUT(
        json('PUT', { user_id: user, user_name: ' 이름 ', restaurant_id: restaurant }),
      );
      assert.equal(response.status, 200);
      assert.equal((await response.json()).visit.restaurant_name, '식당');
      const { sql, values } = calls[0];
      assert.deepEqual(values, [user, '이름', restaurant]);
      assert.match(sql, /s\.active = true/);
      assert.match(sql, /on conflict \(user_id, visit_date\) do update/);
      assert.match(sql, /Asia\/Seoul/);
      // The browser never supplies the date.
      assert.equal(values.length, 3);
    },
  );
  await withDb(
    () => ({ rows: [] }),
    async () => {
      const response = await PUT(
        json('PUT', { user_id: user, user_name: '이름', restaurant_id: restaurant }),
      );
      assert.equal(response.status, 404);
    },
  );
});

test("cancel deletes only the caller's visit for today and is idempotent", async () => {
  for (const rowCount of [1, 0]) {
    await withDb(
      () => ({ rows: [], rowCount }),
      async (calls) => {
        const response = await DELETE(json('DELETE', { user_id: user }));
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { deleted: rowCount === 1 });
        assert.match(
          calls[0].sql,
          /^delete from public\.lunch_visit where user_id = \$1 and visit_date = /,
        );
        assert.deepEqual(calls[0].values, [user]);
      },
    );
  }
});

test('history pages newest first and continues from the last visit date', async () => {
  const days = Array.from({ length: 31 }, (_, i) => ({
    ...row,
    visit_date: `2026-09-${String(30 - i).padStart(2, '0')}`.replace('-09-00', '-08-31'),
  }));
  await withDb(
    () => ({ rows: days }),
    async (calls) => {
      const response = await GET(
        new Request(
          `http://localhost/api/lunch-visits?user_id=${user}&scope=history&cursor=2026-10-01`,
        ),
      );
      const page = await response.json();
      assert.equal(page.visits.length, 30);
      assert.equal(page.hasMore, true);
      assert.equal(page.nextCursor, page.visits[29].visit_date);
      assert.match(calls[0].sql, /order by v\.visit_date desc/);
      assert.deepEqual(calls[0].values, [user, '2026-10-01', 31]);
    },
  );
});

test('unexpected DB errors become a generic 500 without leaking details', async () => {
  const original = console.error;
  const logged: unknown[] = [];
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    await withDb(
      () => {
        throw Object.assign(
          new Error('relation "lunch_visit" does not exist at postgres://secret'),
          {
            code: '42P01',
          },
        );
      },
      async () => {
        const response = await GET(
          new Request(`http://localhost/api/lunch-visits?user_id=${user}`),
        );
        assert.equal(response.status, 500);
        assert.doesNotMatch(JSON.stringify(await response.json()), /secret|relation/);
      },
    );
  } finally {
    console.error = original;
  }
  assert.match(JSON.stringify(logged), /42P01/);
  assert.doesNotMatch(JSON.stringify(logged), /secret/);
});

test('the lunch day runs 00:00-24:00 in Korea regardless of the browser time zone', () => {
  assert.equal(koreanToday(new Date('2026-10-03T14:59:59Z')), '2026-10-03'); // 23:59:59 KST
  assert.equal(koreanToday(new Date('2026-10-03T15:00:00Z')), '2026-10-04'); // 00:00 KST
});

test("tapping today's lunch chooses, cancels the same restaurant, or asks before changing", () => {
  const today = '2026-10-04';
  const other = '44444444-4444-4444-8444-444444444444';
  assert.equal(todayLunchAction(null, restaurant, today), 'choose');
  assert.equal(
    todayLunchAction({ restaurant_id: restaurant, visit_date: today }, restaurant, today),
    'cancel',
  );
  assert.equal(
    todayLunchAction({ restaurant_id: other, visit_date: today }, restaurant, today),
    'change',
  );
  // Yesterday's record (page left open past midnight) is not today's lunch.
  assert.equal(
    todayLunchAction({ restaurant_id: other, visit_date: '2026-10-03' }, restaurant, today),
    'choose',
  );
});
