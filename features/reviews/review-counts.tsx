import RecommendationIcon from './recommendation-icon';
import type { ReviewCounts } from '@/lib/reviews/model';

export default function ReviewCountBadges({
  counts,
  colored = false,
}: {
  counts: ReviewCounts[string] | null;
  colored?: boolean;
}) {
  return (
    <span className="restaurant-review-counts" data-colored={colored || undefined}>
      <span aria-label={`추천 ${counts?.recommended ?? '집계 불가'}`} title="추천">
        <RecommendationIcon recommended={true} />
        <strong aria-hidden="true">{counts?.recommended ?? '—'}</strong>
      </span>
      <span aria-label={`비추천 ${counts?.not_recommended ?? '집계 불가'}`} title="비추천">
        <RecommendationIcon recommended={false} />
        <strong aria-hidden="true">{counts?.not_recommended ?? '—'}</strong>
      </span>
    </span>
  );
}
