import 'server-only';
import type { Pool } from 'pg';
import { withReviewRanks } from '@/features/ranking/ranking-model';
import {
  RANKING_LIMIT,
  RECOMMENDATION_WEIGHT,
  RECOMMENDATION_SMOOTHING,
} from '@/features/ranking/constants';

export type { RankedRestaurant } from '@/features/ranking/ranking-model';
import type { RankedRestaurant } from '@/features/ranking/ranking-model';

function restaurantCountsSql(includeInactive = false) {
  return `
select s.id, s.name, s.category, s.latitude, s.longitude, s.active,
      count(*)::int reviews,
      count(*) filter (where r.is_recommended=true)::int recommended,
      count(*) filter (where r.is_recommended=false)::int not_recommended
    from public.restaurants s join public.review r on r.restaurant_id=s.id
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
// 정책값은 features/ranking/constants.ts에서 관리하고, 공개 랭킹 쿼리는 점수를 반환하지 않습니다.
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
