import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { ReviewError } from '../lib/reviews/model';
import { likeTarget, setReviewLike } from '../lib/server/review-likes';

const user = '11111111-1111-4111-8111-111111111111';
const review = '33333333-3333-4333-8333-333333333333';

function database(row: object) {
  const calls: { sql: string; values: unknown[] }[] = [];
  return {
    db: {
      query: async (sql: string, values: unknown[]) => {
        calls.push({ sql, values });
        return { rows: [row], rowCount: 1 };
      },
    } as unknown as Pool,
    calls,
  };
}

test('liking checks the review and inserts in one statement, ignoring a repeated like', async () => {
  const mock = database({ has_content: true, own: false, like_count: 3 });
  assert.deepEqual(await setReviewLike(mock.db, { review, user }, true), {
    review_id: review,
    liked: true,
    like_count: 3,
  });
  assert.equal(mock.calls.length, 1);
  const { sql, values } = mock.calls[0];
  assert.deepEqual(values, [review, user]);
  assert.match(sql, /from public.review where id=\$1 and enabled=true/);
  assert.match(sql, /coalesce\(btrim\(content\),''\)<>'' has_content/);
  assert.match(sql, /where has_content and user_id is distinct from \$2/);
  assert.match(sql, /on conflict do nothing/);
});

test('missing, own and empty reviews cannot be liked', async () => {
  for (const [row, status, message] of [
    [{ has_content: null, own: null, like_count: 0 }, 404, /찾을 수 없어요/],
    [{ has_content: true, own: true, like_count: 0 }, 400, /내 리뷰/],
    [{ has_content: false, own: false, like_count: 0 }, 400, /내용이 있는 리뷰/],
  ] as const) {
    const mock = database(row);
    await assert.rejects(
      setReviewLike(mock.db, { review, user }, true),
      (error: unknown) =>
        error instanceof ReviewError && error.status === status && message.test(error.message),
    );
  }
});

test('unliking removes only the user like and returns the remaining count', async () => {
  const mock = database({ like_count: 2 });
  assert.deepEqual(await setReviewLike(mock.db, { review, user }, false), {
    review_id: review,
    liked: false,
    like_count: 2,
  });
  assert.match(
    mock.calls[0].sql,
    /delete from public.review_like where review_id=\$1 and user_id=\$2/,
  );
});

test('invalid identifiers are rejected before any database access', () => {
  assert.deepEqual(likeTarget({ review_id: review, user_id: user }), { review, user });
  for (const body of [
    { review_id: 'bad', user_id: user },
    { review_id: review, user_id: 'bad' },
    {},
  ])
    assert.throws(() => likeTarget(body), ReviewError);
});

test('like route rejects cross-origin and invalid bodies before database access', async () => {
  const { POST, DELETE } = await import('../app/api/reviews/likes/route');
  const json = (method: string, body: unknown, origin?: string) =>
    new Request('http://localhost/api/reviews/likes', {
      method,
      headers: { 'Content-Type': 'application/json', ...(origin ? { origin } : {}) },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await POST(json('POST', { review_id: review, user_id: user }, 'https://evil.example'))).status,
    403,
  );
  assert.equal((await POST(json('POST', { review_id: 'bad', user_id: user }))).status, 400);
  assert.equal((await DELETE(json('DELETE', []))).status, 400);
});

test('likes are counted only in the review lists that show them', async () => {
  const { listReviews, listUserReviews, getOwnReview, getReviewVote } =
    await import('../lib/server/reviews');
  const seen: string[] = [];
  const db = {
    query: async (sql: string) => {
      seen.push(sql);
      if (sql.includes('row_to_json(own_review)'))
        return { rows: [{ recommended: 0, not_recommended: 0, mine: null }], rowCount: 1 };
      if (sql.includes('total')) return { rows: [{ total: 0 }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
  } as unknown as Pool;
  const restaurant = '22222222-2222-4222-8222-222222222222';
  const counted = async (run: () => Promise<unknown>) => {
    seen.length = 0;
    await run();
    return seen.some((sql) => sql.includes('public.review_like'));
  };
  assert.equal(await counted(() => listReviews(db, restaurant, user)), true);
  assert.equal(await counted(() => listUserReviews(db, user)), true);
  assert.equal(await counted(() => getOwnReview(db, review, user)), false);
  assert.equal(await counted(() => getReviewVote(db, restaurant, user)), false);
});
