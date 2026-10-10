import 'server-only';
import type { Pool, PoolClient } from 'pg';
import { encodeReviewCursor, type ReviewCursor } from './review-cursor';
import {
  decodeTags,
  ReviewError,
  reviewInput,
  uuid,
  type Review,
  type ReviewVote,
  type OwnRecommendations,
  type ReviewCounts,
  type UserReview,
  type ReviewPage,
  type UserReviewPage,
} from '@/lib/reviews/model';

import { DAILY_REVIEW_LIMIT, REVIEW_PAGE_SIZE } from '@/lib/reviews/constants';
const FIELDS = 'id, user_name, content, is_recommended, tags, created_at, updated_at';
// 좋아요 are counted only in the lists that show them (restaurant reviews, my reviews); other
// lookups (vote snapshot, conflict reload) leave like_count 0. The review_like PK makes it cheap.
const likeCount = (review = 'review') =>
  `(select count(l.review_id)::int from public.review_like l where l.review_id=${review}.id) like_count`;
/** Whether the viewer (`viewer` is a SQL parameter such as $2) liked the outer review row. */
const likedBy = (viewer: string) =>
  `exists (select 1 from public.review_like l where l.review_id=review.id and l.user_id=${viewer}::uuid) liked`;
type ReviewRow = {
  id: string;
  user_name: string | null;
  content: string;
  is_recommended: boolean | null;
  tags: unknown;
  created_at: Date | string;
  updated_at: Date | string | null;
  is_mine: boolean;
  like_count?: number;
  liked?: boolean;
};
type PagedReviewRow = ReviewRow & { cursor_time: string };
type UserReviewRow = PagedReviewRow &
  Pick<
    UserReview,
    'restaurant_id' | 'restaurant_name' | 'restaurant_active' | 'latitude' | 'longitude'
  >;
function iso(value: Date | string) {
  return new Date(value).toISOString();
}
function present(row: ReviewRow): Review {
  return {
    id: row.id,
    user_name: row.user_name,
    content: row.content,
    is_recommended: row.is_recommended,
    tags: decodeTags(row.tags),
    created_at: iso(row.created_at),
    updated_at: row.updated_at === null ? null : iso(row.updated_at),
    is_mine: row.is_mine,
    like_count: row.like_count ?? 0,
    liked: row.liked ?? false,
  };
}
function pageCursor(rows: PagedReviewRow[], restaurantActive?: boolean) {
  const last = rows[REVIEW_PAGE_SIZE - 1];
  // Keep PostgreSQL microseconds: JS Date loses precision at page boundaries.
  return rows.length > REVIEW_PAGE_SIZE && last
    ? encodeReviewCursor({
        createdAt: last.cursor_time,
        id: last.id,
        ...(restaurantActive === undefined ? {} : { restaurantActive }),
      })
    : null;
}
export async function listReviews(
  db: Pool,
  restaurant: string,
  user: string | null,
  cursor: ReviewCursor | null = null,
): Promise<ReviewPage> {
  const summary = await db.query<{ total: number; recommended: number; not_recommended: number }>(
    `select count(*)::int total,
    count(*) filter (where is_recommended=true)::int recommended,
    count(*) filter (where is_recommended=false)::int not_recommended
    from public.review where restaurant_id=$1 and enabled=true`,
    [restaurant],
  );
  const rows = await db.query<PagedReviewRow>(
    `select ${FIELDS}, ${likeCount()}, ${likedBy('$2')}, coalesce(user_id=$2::uuid,false) is_mine,
    to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') cursor_time
    from public.review where restaurant_id=$1 and enabled=true
    and ($3::timestamptz is null or (created_at,id)<($3::timestamptz,$4::uuid))
    order by created_at desc,id desc limit $5`,
    [restaurant, user, cursor?.createdAt ?? null, cursor?.id ?? null, REVIEW_PAGE_SIZE + 1],
  );
  const mine = user
    ? await db.query<ReviewRow>(
        `select ${FIELDS}, true is_mine from public.review where restaurant_id=$1 and user_id=$2 and enabled=true order by created_at desc,id desc limit 1`,
        [restaurant, user],
      )
    : { rows: [] };
  return {
    ...summary.rows[0],
    reviews: rows.rows.slice(0, REVIEW_PAGE_SIZE).map(present),
    mine: mine.rows[0] ? present(mine.rows[0]) : null,
    hasMore: rows.rows.length > REVIEW_PAGE_SIZE,
    nextCursor: pageCursor(rows.rows),
  };
}
export async function getOwnReview(db: Pool, id: string, user: string): Promise<Review | null> {
  const { rows } = await db.query<ReviewRow>(
    `select ${FIELDS}, true is_mine from public.review where id=$1 and user_id=$2 and enabled=true`,
    [id, user],
  );
  return rows[0] ? present(rows[0]) : null;
}
/** A compact snapshot used by voting; does not load other users' review content. */
export async function getReviewVote(
  db: Pick<PoolClient, 'query'>,
  restaurant: string,
  user: string,
): Promise<ReviewVote> {
  const { rows } = await db.query<{
    recommended: number;
    not_recommended: number;
    mine: ReviewRow | null;
  }>(
    `select count(*) filter (where is_recommended=true)::int recommended,
      count(*) filter (where is_recommended=false)::int not_recommended,
      (select row_to_json(own_review) from (
        select ${FIELDS}, true is_mine from public.review
        where restaurant_id=$1 and user_id=$2 and enabled=true
        order by created_at desc,id desc limit 1
      ) own_review) mine
    from public.review where restaurant_id=$1 and enabled=true`,
    [restaurant, user],
  );
  const result = rows[0];
  return {
    recommended: result.recommended,
    not_recommended: result.not_recommended,
    mine: result.mine ? present(result.mine) : null,
  };
}

export async function mutateReview(db: Pool, method: string, body: Record<string, unknown>) {
  const user = uuid(body.user_id);
  const restaurant = method === 'POST' ? uuid(body.restaurant_id) : null;
  const id = method === 'POST' ? null : uuid(body.id);
  const version = typeof body.version === 'string' ? body.version : '';
  if (method !== 'POST' && (!version || !Number.isFinite(Date.parse(version))))
    throw new ReviewError('리뷰를 새로 불러온 뒤 다시 시도해 주세요.');
  const input = method === 'DELETE' ? null : reviewInput(body);
  const name = typeof body.user_name === 'string' ? body.user_name.trim() : '';
  if (method === 'POST' && (!name || Array.from(name).length > 60))
    throw new ReviewError('닉네임 정보를 확인해 주세요.');
  const client = await db.connect();
  try {
    await client.query('begin');
    let target = restaurant;
    if (method === 'POST') {
      // Serialize all submissions by the same author so the duplicate and daily-limit checks
      // cannot both pass for concurrent requests.
      await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [
        `review:${user}`,
      ]);
      const exists = await client.query(
        'select id from public.review where restaurant_id=$1 and user_id=$2 and enabled=true limit 1',
        [restaurant, user],
      );
      if (exists.rowCount)
        throw new ReviewError('이미 작성한 리뷰가 있어요. 기존 리뷰를 수정해 주세요.', 409);
      const available = await client.query(
        'select id from public.restaurants where id=$1 and active=true for share',
        [restaurant],
      );
      if (!available.rowCount)
        throw new ReviewError('지금은 리뷰를 작성할 수 없는 식당이에요.', 404);
      // Deleted (enabled=false) reviews still count, so deleting never frees a daily slot.
      const today = await client.query<{ count: number }>(
        `select count(*)::int count from public.review
      where user_id=$1
        and created_at >= ((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')`,
        [user],
      );
      if ((today.rows[0]?.count ?? 0) >= DAILY_REVIEW_LIMIT)
        throw new ReviewError(
          `하루에 작성할 수 있는 리뷰 ${DAILY_REVIEW_LIMIT}개를 모두 사용했어요.`,
          429,
        );
      await client.query(
        `insert into public.review (restaurant_id,user_id,user_name,content,is_recommended,tags,updated_at)
      values ($1,$2,$3,$4,$5,$6,null)`,
        [
          restaurant,
          user,
          name,
          input!.content,
          input!.is_recommended,
          JSON.stringify(input!.tags),
        ],
      );
    } else {
      // Ownership is intentionally based on the supplied localStorage ID, not authentication.
      const condition =
        "id=$1 and user_id=$2 and enabled=true and date_trunc('milliseconds',coalesce(updated_at,created_at))=$3::timestamptz";
      let result;
      // A review with written content is deleted logically: the row stays, hidden with enabled=false.
      // A recommendation alone (no content) is removed for real, so undoing a 추천/비추천 click does
      // not use up the daily limit, which counts every row created today.
      if (method === 'DELETE')
        result = await client.query(
          `with target as (select id, coalesce(btrim(content),'')='' as empty from public.review where ${condition}),
      removed as (delete from public.review where id in (select id from target where empty) returning id, restaurant_id),
      hidden as (update public.review set enabled=false where id in (select id from target where not empty) returning id, restaurant_id)
      select id, restaurant_id from removed union all select id, restaurant_id from hidden`,
          [id, user, version],
        );
      else {
        result = await client.query(
          `update public.review set content=$4,is_recommended=$5,tags=$6,updated_at=now() where ${condition} returning id, restaurant_id`,
          [id, user, version, input!.content, input!.is_recommended, JSON.stringify(input!.tags)],
        );
      }
      if (!result.rowCount)
        throw new ReviewError('리뷰가 바뀌었거나 수정·삭제할 수 없어요. 새로고침해 주세요.', 409);
      target = result.rows[0].restaurant_id;
    }
    const vote = await getReviewVote(client, target!, user);
    await client.query('commit');
    return { restaurant_id: target!, ...vote };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

// Aggregate once for the list instead of requesting reviews for every restaurant.
export async function getReviewCounts(db: Pool): Promise<ReviewCounts> {
  const { rows } = await db.query<{
    restaurant_id: string;
    recommended: number;
    not_recommended: number;
  }>(`
    select restaurant_id,
      count(*) filter (where is_recommended=true)::int recommended,
      count(*) filter (where is_recommended=false)::int not_recommended
    from public.review where enabled=true group by restaurant_id
  `);
  return Object.fromEntries(rows.map(({ restaurant_id, ...counts }) => [restaurant_id, counts]));
}

export async function listUserReviews(
  db: Pool,
  user: string,
  cursor: ReviewCursor | null = null,
): Promise<UserReviewPage> {
  const summary = await db.query<Omit<UserReviewPage, 'reviews' | 'hasMore' | 'nextCursor'>>(
    `with mine as (
    select distinct on (restaurant_id) restaurant_id, is_recommended
    from public.review where user_id=$1 and enabled=true
    order by restaurant_id, created_at desc, id desc
  ), lunched as (
    select distinct restaurant_id from public.lunch_visit where user_id=$1
  )
  select (select count(*)::int from public.review where user_id=$1 and enabled=true) total,
    count(*)::int active_total,
    count(mine.restaurant_id)::int reviewed_active,
    count(lunched.restaurant_id)::int lunched_active,
    count(*) filter (where mine.restaurant_id is not null or lunched.restaurant_id is not null)::int visited_active,
    count(*) filter (where mine.is_recommended=true)::int recommended_active,
    count(*) filter (where mine.is_recommended=false)::int not_recommended_active
  from public.restaurants s left join mine on mine.restaurant_id=s.id
  left join lunched on lunched.restaurant_id=s.id
  where s.active=true`,
    [user],
  );
  const { rows } = await db.query<UserReviewRow>(
    `select r.id, r.user_name, r.content, r.is_recommended, r.tags,
    r.created_at, r.updated_at, true is_mine, r.restaurant_id, ${likeCount('r')},
    to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') cursor_time,
    s.name restaurant_name, s.active restaurant_active, s.latitude, s.longitude
    from public.review r join public.restaurants s on s.id=r.restaurant_id
    where r.user_id=$1 and r.enabled=true and ($2::timestamptz is null or (coalesce(s.active,false),r.created_at,r.id)<($5::boolean,$2::timestamptz,$3::uuid))
    order by coalesce(s.active,false) desc,r.created_at desc,r.id desc limit $4`,
    [
      user,
      cursor?.createdAt ?? null,
      cursor?.id ?? null,
      REVIEW_PAGE_SIZE + 1,
      cursor?.restaurantActive ?? true,
    ],
  );
  return {
    ...summary.rows[0],
    reviews: rows.slice(0, REVIEW_PAGE_SIZE).map((row) => ({
      ...present(row),
      restaurant_id: row.restaurant_id,
      restaurant_name: row.restaurant_name,
      restaurant_active: row.restaurant_active,
      latitude: row.latitude,
      longitude: row.longitude,
    })),
    hasMore: rows.length > REVIEW_PAGE_SIZE,
    nextCursor: pageCursor(rows, Boolean(rows[REVIEW_PAGE_SIZE - 1]?.restaurant_active)),
  };
}

/** Restaurants the user reviewed, each with that review's 추천(true)/비추천(false)/none(null). */
export async function listOwnRecommendations(db: Pool, user: string): Promise<OwnRecommendations> {
  const { rows } = await db.query<{ restaurant_id: string; is_recommended: boolean | null }>(
    `select distinct on (restaurant_id) restaurant_id, is_recommended
    from public.review where user_id=$1 and enabled=true
    order by restaurant_id, created_at desc, id desc`,
    [user],
  );
  return Object.fromEntries(rows.map((row) => [row.restaurant_id, row.is_recommended]));
}
