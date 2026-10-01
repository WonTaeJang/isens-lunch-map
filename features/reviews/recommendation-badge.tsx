import RecommendationIcon from './recommendation-icon';

export default function RecommendationBadge({ recommended }: { recommended: boolean | null }) {
  if (recommended === null) return <span className="subtle">평가 없음</span>;
  return (
    <span
      className={`recommendation-badge ${recommended ? 'is-recommended' : 'is-not-recommended'}`}
    >
      <RecommendationIcon recommended={recommended} />
      {recommended ? '추천' : '비추천'}
    </span>
  );
}
