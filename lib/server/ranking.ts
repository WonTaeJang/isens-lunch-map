import 'server-only';
import type { Pool } from 'pg';
import { withReviewRanks } from '@/lib/ranking/model';
import {
  LUNCH_RANKING_DAYS,
  RANKING_LIMIT,
  RECOMMENDATION_WEIGHT,
  RECOMMENDATION_SMOOTHING,
} from '@/lib/ranking/constants';

import type { LunchRankedRestaurant, RankedRestaurant } from '@/lib/ranking/model';

function restaurantCountsSql(includeInactive = false) {
  return `
select s.id, s.name, s.category, s.latitude, s.longitude, s.active,
      count(*)::int reviews,
      count(*) filter (where r.is_recommended=true)::int recommended,
      count(*) filter (where r.is_recommended=false)::int not_recommended
    from public.restaurants s join public.review r on r.restaurant_id=s.id and r.enabled=true
    ${includeInactive ? '' : 'where s.active=true'}
    group by s.id, s.name, s.category, s.latitude, s.longitude, s.active
`;
}

export async function getRestaurantRanking(db: Pool): Promise<RankedRestaurant[]> {
  const { rows } = await db.query<Omit<RankedRestaurant, 'rank'>>(
    `
    ${restaurantCountsSql()}
    order by reviews desc, s.name, s.id limit $1
  `,
    [RANKING_LIMIT],
  );
  return withReviewRanks(rows);
}

// 추천 점수 = (추천 × 가중치 1.5) / (추천 × 가중치 1.5 + 비추천 + 보정값 5) × 100.
// 실제 추천률이 아닌 정렬용 보정 점수이며, 반올림 전 점수가 같으면 공동 순위입니다.
// 관리자 통계에서는 점수와 산정 방식을 표시하며, 공개 랭킹에서는 표시하지 않습니다.
// 정책값은 lib/ranking/constants.ts에서 관리하고, 공개 랭킹 쿼리는 점수를 반환하지 않습니다.
export function recommendationRankingSql(includeInactive = false) {
  return `
    with counts as (
      ${restaurantCountsSql(includeInactive)}
    ), scored as (
      select *, (recommended * $2::numeric) / (recommended * $2::numeric + not_recommended + $3::numeric) * 100 score
      from counts where recommended + not_recommended > 0
    )
    select id, name, category, latitude, longitude, active, reviews, recommended, not_recommended,
      score::float8 score, (rank() over (order by score desc))::int rank
    from scored order by scored.score desc, name, id limit $1
  `;
}

export async function getRecommendationRanking(db: Pool): Promise<RankedRestaurant[]> {
  const { rows } = await db.query<RankedRestaurant>(
    `
    select id, name, category, latitude, longitude, reviews, recommended, not_recommended, rank
    from (${recommendationRankingSql()}) ranking order by rank, name, id
  `,
    [RANKING_LIMIT, RECOMMENDATION_WEIGHT, RECOMMENDATION_SMOOTHING],
  );
  return rows;
}

// 점심 랭킹: 최근 30일(한국 날짜, 오늘 포함) 오늘의 점심 기록 수. 공개 랭킹은 활성 식당만,
// 관리자 통계는 비활성 식당까지 집계합니다. 같은 횟수면 고른 사람 수로 순위를 나누며 그래도
// 같으면 공동 순위입니다(최근 기록 순으로 표시). 누가 골랐는지는 반환하지 않습니다.
// position은 화면 표시 순서이며, 파라미터 번호는 호출하는 쿼리에 맞춰 넘깁니다.
export function lunchRankingSql(includeInactive = false, params = { limit: '$1', days: '$2' }) {
  return `
    with visits as (
      select restaurant_id, count(*)::int visits, count(distinct user_id)::int people,
        max(visit_date) last_visit
      from public.lunch_visit
      where visit_date > (now() at time zone 'Asia/Seoul')::date - ${params.days}::int
      group by restaurant_id
    )
    select s.id, s.name, s.category, s.latitude, s.longitude, s.active, v.visits, v.people,
      (rank() over (order by v.visits desc, v.people desc))::int rank,
      (row_number() over (order by v.visits desc, v.people desc, v.last_visit desc, s.name, s.id))::int position
    from visits v
    join public.restaurants s on s.id=v.restaurant_id${includeInactive ? '' : ' and s.active=true'}
    order by position limit ${params.limit}
  `;
}

export async function getLunchRanking(db: Pool): Promise<LunchRankedRestaurant[]> {
  const { rows } = await db.query<LunchRankedRestaurant>(
    `
    select l.id, l.name, l.category, l.latitude, l.longitude, l.visits, l.people, l.rank,
      coalesce(r.reviews, 0) reviews, coalesce(r.recommended, 0) recommended,
      coalesce(r.not_recommended, 0) not_recommended
    from (${lunchRankingSql()}) l
    left join (
      select restaurant_id, count(*)::int reviews,
        count(*) filter (where is_recommended=true)::int recommended,
        count(*) filter (where is_recommended=false)::int not_recommended
      from public.review where enabled=true
      group by restaurant_id
    ) r on r.restaurant_id=l.id
    order by l.position
  `,
    [RANKING_LIMIT, LUNCH_RANKING_DAYS],
  );
  return rows;
}
