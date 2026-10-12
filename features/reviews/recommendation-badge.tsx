import RecommendationIcon from './recommendation-icon';
import styles from './recommendation-badge.module.css';

export default function RecommendationBadge({
  recommended,
  className,
}: {
  recommended: boolean | null;
  /** Applied to the 추천/비추천 badge only, not to the "평가 없음" text. */
  className?: string;
}) {
  if (recommended === null) return <span className="subtle">평가 없음</span>;
  const tone = recommended ? styles.recommended : styles.notRecommended;
  return (
    <span className={[styles.badge, tone, className].filter(Boolean).join(' ')}>
      <RecommendationIcon recommended={recommended} />
      {recommended ? '추천' : '비추천'}
    </span>
  );
}
