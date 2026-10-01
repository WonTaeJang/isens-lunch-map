import 'server-only';
import type { Pool } from 'pg';
import type { AdminStatistics } from '@/features/admin/statistics-model';
import { REVIEW_TAGS } from '@/features/reviews/constants';
import { decodeTags } from '@/features/reviews/review-model';

type Summary = Omit<AdminStatistics, 'tags'> & { tagGroups: { tags: unknown; count: number }[] };

export async function getAdminStatistics(db: Pool): Promise<AdminStatistics> {
  const { rows } = await db.query<Summary>(`
    with days as (
      select (now() at time zone 'Asia/Seoul')::date - offset_day AS review_date
      from generate_series(0, 6) offset_day
    ), daily as (
      select (created_at at time zone 'Asia/Seoul')::date AS review_date, count(*)::int count
      from public.review
      where created_at >= (((now() at time zone 'Asia/Seoul')::date - 6)::timestamp at time zone 'Asia/Seoul')
        and created_at < (((now() at time zone 'Asia/Seoul')::date + 1)::timestamp at time zone 'Asia/Seoul')
      group by 1
    )
    select count(distinct user_id)::int users, count(*)::int reviews,
      count(*) filter (where is_recommended=true)::int recommended,
      count(*) filter (where is_recommended=false)::int "notRecommended",
      (select count(*)::int from public.restaurants where active=true) "activeRestaurants",
      (select count(*)::int from public.restaurants s where s.active=true
        and exists (select 1 from public.review r where r.restaurant_id=s.id)) "reviewedRestaurants",
      (select coalesce(jsonb_agg(g), '[]'::jsonb) from
        (select tags, count(*)::int count from public.review group by tags) g) "tagGroups",
      (select jsonb_agg(jsonb_build_object('date', to_char(days.review_date, 'YYYY-MM-DD'), 'count', coalesce(daily.count, 0)) order by days.review_date)
        from days left join daily using (review_date)) "recentDays",
      (select coalesce(jsonb_agg(g order by g.name, g.id), '[]'::jsonb) from
        (select s.id, s.name from public.restaurants s where s.active=true
          and not exists (select 1 from public.review r where r.restaurant_id=s.id)) g) "unreviewedRestaurants",
      (select coalesce(jsonb_agg(g order by g.count desc, g.name, g.id), '[]'::jsonb) from
        (select s.id, s.name, s.active, count(*)::int count
          from public.review r join public.restaurants s on s.id=r.restaurant_id
          group by s.id, s.name, s.active order by count desc, s.name, s.id limit 10) g) "topRestaurants"
    from public.review
  `);
  const { tagGroups, ...summary } = rows[0];
  const counts = new Map<string, number>();
  for (const group of tagGroups) {
    for (const tag of new Set(decodeTags(group.tags)))
      counts.set(tag, (counts.get(tag) ?? 0) + group.count);
  }
  return {
    ...summary,
    tags: REVIEW_TAGS.map(({ value, label }) => ({
      value,
      label,
      count: counts.get(value) ?? 0,
    })).sort((a, b) => b.count - a.count),
  };
}
