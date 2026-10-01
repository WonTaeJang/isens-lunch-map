import type { ReviewCounts } from './review-model';

export default function ReviewCountBadges({ counts }: { counts: ReviewCounts[string] | null }) {
  return <span className="restaurant-review-counts">
    <span aria-label={`추천 ${counts?.recommended ?? '집계 불가'}`} title="추천">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10H3v11h4V10Zm0 0 5-8a3 3 0 0 1 3 3l-1 5h5a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7" /></svg>
      <strong aria-hidden="true">{counts?.recommended ?? '—'}</strong>
    </span>
    <span aria-label={`비추천 ${counts?.not_recommended ?? '집계 불가'}`} title="비추천">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><g transform="rotate(180 12 12)"><path d="M7 10H3v11h4V10Zm0 0 5-8a3 3 0 0 1 3 3l-1 5h5a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7" /></g></svg>
      <strong aria-hidden="true">{counts?.not_recommended ?? '—'}</strong>
    </span>
  </span>;
}
