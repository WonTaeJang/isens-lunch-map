import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { reviewInput, decodeTags, ReviewError } from '../lib/reviews/model';
import { getReviewCounts, listReviews, mutateReview } from '../lib/server/reviews';

const user = '11111111-1111-4111-8111-111111111111';
const restaurant = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const input = {
  user_id: user,
  restaurant_id: restaurant,
  user_name: '즐거운만두#0123',
  content: '좋아요',
  is_recommended: false,
  tags: ['tasty'],
};
const version = '2026-10-01T01:00:00.123Z';
const cursor = { createdAt: '2026-10-01T01:00:00.123456Z', id };
const row = {
  id,
  user_name: '사용자',
  content: '리뷰',
  is_recommended: null,
  created_at: new Date(version),
  updated_at: null,
  cursor_time: cursor.createdAt,
  tags: null,
  is_mine: false,
};
function database(
  handler: (sql: string, values: unknown[]) => { rows: object[]; rowCount: number },
) {
  const calls: { sql: string; values: unknown[] }[] = [];
  let released = false;
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    return handler(sql, values);
  };
  return {
    db: {
      query,
      connect: async () => ({
        query,
        release: () => {
          released = true;
        },
      }),
    } as unknown as Pool,
    calls,
    released: () => released,
  };
}
test('review validation counts Unicode code points and accepts false recommendation', () => {
  assert.equal(reviewInput({ ...input, content: '🍚'.repeat(1000) }).content.length, 2000);
  assert.equal(reviewInput(input).is_recommended, false);
  assert.equal(reviewInput({ ...input, content: ' '.repeat(4) }).content, '');
  assert.equal(reviewInput({ ...input, content: undefined }).content, '');
  for (const change of [
    { content: '가'.repeat(1001) },
    { is_recommended: null },
    { tags: ['tasty', 'tasty'] },
    { tags: ['unknown'] },
    { tags: ['tasty', 'waiting', 'good_value', 'quick_service'] },
  ]) {
    assert.throws(() => reviewInput({ ...input, ...change }), ReviewError);
  }
  assert.deepEqual(decodeTags('["tasty","unknown"]'), ['tasty']);
  assert.deepEqual(decodeTags(null), []);
  assert.deepEqual(decodeTags('invalid'), []);
});
test('new reviews lock per author, preserve false, store text JSON and start without updated_at', async () => {
  const mock = database((sql) => ({
    rows: [],
    rowCount: sql.includes('public.restaurants') ? 1 : 0,
  }));
  await mutateReview(mock.db, 'POST', input);
  const insert = mock.calls.find((call) => call.sql.startsWith('insert'))!;
  assert.deepEqual(insert.values, [
    restaurant,
    user,
    input.user_name,
    input.content,
    false,
    '["tasty"]',
  ]);
  assert.match(insert.sql, /\$6,null/);
  assert.ok(
    mock.calls.some(
      (call) => call.sql.includes('pg_advisory_xact_lock') && call.values[0] === `review:${user}`,
    ),
  );
  assert.equal(mock.calls.at(-1)?.sql, 'commit');
  assert.equal(mock.released(), true);
});
test('daily limit counts every review created today, including deleted ones', async () => {
  for (const [count, allowed] of [
    [4, true],
    [5, false],
  ] as const) {
    const mock = database((sql) => {
      if (sql.includes('count(*)')) return { rows: [{ count }], rowCount: 1 };
      return { rows: [], rowCount: sql.includes('public.restaurants') ? 1 : 0 };
    });
    const saving = mutateReview(mock.db, 'POST', input);
    if (allowed) await saving;
    else
      await assert.rejects(
        saving,
        (error: unknown) => error instanceof ReviewError && error.status === 429,
      );
    const counted = mock.calls.find((call) => call.sql.includes('count(*)'))!;
    assert.deepEqual(counted.values, [user]);
    assert.doesNotMatch(counted.sql, /enabled/);
    assert.match(counted.sql, /Asia\/Seoul/);
    assert.equal(
      mock.calls.some((call) => call.sql.startsWith('insert')),
      allowed,
    );
    assert.equal(mock.calls.at(-1)?.sql, allowed ? 'commit' : 'rollback');
    assert.equal(mock.released(), true);
  }
});
test('duplicate check ignores deleted reviews so the same restaurant can be reviewed again', async () => {
  const mock = database((sql) => ({
    rows: [],
    rowCount: sql.includes('public.restaurants') ? 1 : 0,
  }));
  await mutateReview(mock.db, 'POST', input);
  const duplicate = mock.calls.find((call) => call.sql.includes('select id from public.review'))!;
  assert.match(duplicate.sql, /enabled=true/);
});
test('duplicates, inactive restaurants and failed inserts roll back without commit', async () => {
  for (const scenario of ['duplicate', 'inactive', 'failure']) {
    const mock = database((sql) => {
      if (sql.startsWith('insert') && scenario === 'failure') throw new Error('DB failure');
      return {
        rows: [],
        rowCount:
          (sql.includes('select id from public.review') && scenario === 'duplicate') ||
          (sql.includes('public.restaurants') && scenario !== 'inactive')
            ? 1
            : 0,
      };
    });
    await assert.rejects(mutateReview(mock.db, 'POST', input));
    assert.equal(mock.calls.at(-1)?.sql, 'rollback');
    assert.equal(
      mock.calls.some((call) => call.sql === 'commit'),
      false,
    );
    assert.equal(mock.released(), true);
  }
});
test('edit and delete scope writes to supplied owner and timestamp; stale or wrong owner is rejected', async () => {
  for (const method of ['PATCH', 'DELETE']) {
    const mock = database(() => ({ rows: [{ id }], rowCount: 1 }));
    await mutateReview(mock.db, method, { ...input, id, version });
    assert.match(mock.calls[0].sql, /id=\$1 and user_id=\$2/);
    assert.match(
      mock.calls[0].sql,
      /date_trunc\('milliseconds',coalesce\(updated_at,created_at\)\)=\$3/,
    );
    assert.deepEqual(mock.calls[0].values.slice(0, 3), [id, user, version]);
    assert.match(mock.calls[0].sql, /enabled=true/);
    if (method === 'PATCH') assert.match(mock.calls[0].sql, /updated_at=now\(\)/);
    else {
      // Written reviews are hidden; a recommendation without content is removed outright.
      assert.match(
        mock.calls[0].sql,
        /^with target as \(select id, coalesce\(btrim\(content\),''\)='' as empty/,
      );
      assert.match(
        mock.calls[0].sql,
        /delete from public.review where id in \(select id from target where empty\)/,
      );
      assert.match(
        mock.calls[0].sql,
        /update public.review set enabled=false where id in \(select id from target where not empty\)/,
      );
    }
    const missing = database(() => ({ rows: [], rowCount: 0 }));
    await assert.rejects(
      mutateReview(missing.db, method, { ...input, id, version }),
      (error: unknown) => error instanceof ReviewError && error.status === 409,
    );
  }
});
test('invalid identity or missing review version never sends a write', async () => {
  const mock = database(() => {
    throw new Error('unexpected query');
  });
  await assert.rejects(
    mutateReview(mock.db, 'DELETE', { id, user_id: 'invalid', version }),
    ReviewError,
  );
  await assert.rejects(mutateReview(mock.db, 'PATCH', { ...input, id }), ReviewError);
  assert.equal(mock.calls.length, 0);
});
test('list paginates and exposes ownership flag without selecting author UUIDs', async () => {
  const mock = database((sql) => {
    if (sql.includes('count(*)'))
      return { rows: [{ total: 21, recommended: 20, not_recommended: 1 }], rowCount: 1 };
    if (sql.includes('true is_mine')) return { rows: [{ ...row, is_mine: true }], rowCount: 1 };
    return {
      rows: Array.from({ length: 21 }, (_, index) => ({
        ...row,
        id: `33333333-3333-4333-8333-${String(index).padStart(12, '0')}`,
        tags: '["tasty"]',
      })),
      rowCount: 21,
    };
  });
  const result = await listReviews(mock.db, restaurant, user);
  assert.equal(result.reviews.length, 20);
  assert.equal(result.hasMore, true);
  assert.equal(result.mine?.is_mine, true);
  assert.deepEqual(result.reviews[0].tags, ['tasty']);

  assert.ok(mock.calls.every((call) => !/select[^]*, user_id,/.test(call.sql)));
  assert.ok(mock.calls.every((call) => /enabled=true/.test(call.sql)));
});

test('list counts use one grouped query and keep recommendations separated by restaurant', async () => {
  const mock = database((sql) => {
    assert.match(sql, /group by restaurant_id/);
    assert.match(sql, /where is_recommended=true/);
    assert.match(sql, /where is_recommended=false/);
    return {
      rows: [
        { restaurant_id: restaurant, recommended: 2, not_recommended: 1 },
        { restaurant_id: id, recommended: 0, not_recommended: 3 },
      ],
      rowCount: 2,
    };
  });
  assert.deepEqual(await getReviewCounts(mock.db), {
    [restaurant]: { recommended: 2, not_recommended: 1 },
    [id]: { recommended: 0, not_recommended: 3 },
  });
  assert.equal(mock.calls.length, 1);
  assert.match(mock.calls[0].sql, /where enabled=true group by restaurant_id/);
});

test('my reviews are scoped to one user, join restaurant data and include inactive history', async () => {
  const { listUserReviews } = await import('../lib/server/reviews');
  const mock = database((sql, values) => {
    assert.equal(values[0], user);
    if (sql.includes('count(*)')) {
      assert.match(sql, /where user_id=\$1/);
      return { rows: [{ total: 21 }], rowCount: 1 };
    }
    assert.match(sql, /where r.user_id=\$1 and r.enabled=true/);
    assert.match(sql, /join public.restaurants/);
    assert.doesNotMatch(sql, /active\s*=\s*true/);
    assert.deepEqual(values, [user, cursor.createdAt, cursor.id, 21, true]);
    assert.match(sql, /\(coalesce\(s.active,false\),r.created_at,r.id\)</);
    assert.match(sql, /order by coalesce\(s.active,false\) desc,r.created_at desc,r.id desc/);
    assert.doesNotMatch(sql, /offset/i);
    return {
      rows: Array.from({ length: 21 }, (_, i) => ({
        ...row,
        id: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
        restaurant_id: restaurant,
        restaurant_name: '식당',
        restaurant_active: false,
        tags: '["tasty"]',
      })),
      rowCount: 21,
    };
  });
  const result = await listUserReviews(mock.db, user, cursor);
  assert.equal(result.total, 21);
  assert.equal(result.reviews.length, 20);
  assert.equal(result.hasMore, true);
  assert.deepEqual(result.reviews[0].tags, ['tasty']);
  const { decodeReviewCursor } = await import('../lib/server/review-cursor');
  assert.equal(decodeReviewCursor(result.nextCursor)?.restaurantActive, false);
});

test('expanded tags preserve existing codes and allow mixed experiences for either recommendation', async () => {
  const { REVIEW_TAGS, REVIEW_TAG_GROUPS } = await import('../lib/reviews/constants');
  assert.equal(REVIEW_TAGS.length, 16);
  assert.equal(new Set(REVIEW_TAGS.map((tag) => tag.value)).size, 16);
  assert.equal(REVIEW_TAG_GROUPS.flatMap((group) => group.tags).length, 16);
  const oldTags = [
    'tasty',
    'generous_portions',
    'good_value',
    'quick_service',
    'solo_friendly',
    'group_friendly',
    'waiting',
  ];
  assert.deepEqual(decodeTags(JSON.stringify(oldTags)), oldTags);
  for (const recommended of [true, false]) {
    const tags = ['friendly_service', 'small_portions', 'solo_friendly'];
    assert.deepEqual(reviewInput({ ...input, is_recommended: recommended, tags }).tags, tags);
    assert.throws(() => reviewInput({ ...input, tags: [...tags, 'noisy_place'] }), ReviewError);
  }
});

test('own recommendation lookup returns each reviewed restaurant with its choice in one user-scoped query', async () => {
  const { listOwnRecommendations } = await import('../lib/server/reviews');
  const mock = database((sql, values) => {
    assert.match(sql, /select distinct on \(restaurant_id\) restaurant_id, is_recommended/);
    assert.match(sql, /where user_id=\$1/);
    assert.doesNotMatch(sql, /limit|content|user_name/);
    assert.match(sql, /enabled=true/);
    assert.deepEqual(values, [user]);
    return {
      rows: [
        { restaurant_id: restaurant, is_recommended: true },
        { restaurant_id: id, is_recommended: null },
      ],
      rowCount: 2,
    };
  });
  assert.deepEqual(await listOwnRecommendations(mock.db, user), { [restaurant]: true, [id]: null });
  assert.equal(mock.calls.length, 1);
});

test('user statistics aggregate all active restaurants independently of review pagination', async () => {
  const { listUserReviews } = await import('../lib/server/reviews');
  const stats = {
    total: 45,
    active_total: 100,
    reviewed_active: 30,
    recommended_active: 21,
    not_recommended_active: 9,
  };
  const mock = database((sql, values) => {
    if (sql.includes('with mine as')) {
      assert.deepEqual(values, [user]);
      assert.match(sql, /distinct on \(restaurant_id\)/);
      assert.equal(sql.match(/enabled=true/g)?.length, 2);
      assert.match(sql, /where s.active=true/);
      assert.match(sql, /left join mine/);
      assert.doesNotMatch(sql, /limit|offset/);
      return { rows: [stats], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  const result = await listUserReviews(mock.db, user, cursor);
  assert.deepEqual(result, { ...stats, reviews: [], hasMore: false, nextCursor: null });
});

test('review response serializes dates and never leaks DB fields or author identifiers', async () => {
  const { getOwnReview } = await import('../lib/server/reviews');
  const mock = database((sql, values) => {
    assert.match(sql, /enabled=true/);
    assert.deepEqual(values, [id, user]);
    return { rows: [{ ...row, user_id: user, internal: 'private', is_mine: true }], rowCount: 1 };
  });
  assert.deepEqual(await getOwnReview(mock.db, id, user), {
    id,
    user_name: row.user_name,
    content: row.content,
    is_recommended: null,
    created_at: version,
    updated_at: null,
    tags: [],
    is_mine: true,
  });
});
test('cursor preserves microseconds and rejects malformed inputs', async () => {
  const { encodeReviewCursor, decodeReviewCursor } = await import('../lib/server/review-cursor');
  assert.deepEqual(decodeReviewCursor(encodeReviewCursor(cursor)), cursor);
  const inactiveCursor = { ...cursor, restaurantActive: false };
  assert.deepEqual(decodeReviewCursor(encodeReviewCursor(inactiveCursor)), inactiveCursor);
  assert.equal(decodeReviewCursor(null), null);
  for (const raw of [
    'invalid',
    'x'.repeat(513),
    Buffer.from(JSON.stringify({ ...cursor, id: 'bad' })).toString('base64url'),
  ]) {
    assert.throws(() => decodeReviewCursor(raw), ReviewError);
  }
});
