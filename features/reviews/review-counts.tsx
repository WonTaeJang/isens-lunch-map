import RecommendationIcon from './recommendation-icon';
import type { ReviewCounts } from '@/lib/reviews/model';

export default function ReviewCountBadges({
  counts,
  colored = false,
  mine = null,
}: {
  counts: ReviewCounts[string] | null;
  colored?: boolean;
  /** The viewer's own 추천(true)/비추천(false): that side is filled in its color. */
  mine?: boolean | null;
}) {
  return (
    <span className="restaurant-review-counts" data-colored={colored || undefined}>
      {[true, false].map((recommended) => {
        const label = recommended ? '추천' : '비추천';
        const count = recommended ? counts?.recommended : counts?.not_recommended;
        const own = mine === recommended;
        return (
          <span
            key={label}
            aria-label={`${label} ${count ?? '집계 불가'}${own ? ' (내 평가)' : ''}`}
            title={own ? `내가 ${label}한 식당` : label}
            data-mine={own || undefined}
          >
            <RecommendationIcon recommended={recommended} filled={own} />
            <strong aria-hidden="true">{count ?? '—'}</strong>
          </span>
        );
      })}
    </span>
  );
}
