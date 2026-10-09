import RecommendationIcon from './recommendation-icon';
import { formatPercent, percent } from '@/lib/percent';
import styles from './recommendation-bar.module.css';

export default function RecommendationBar({
  recommended,
  notRecommended,
}: {
  recommended: number;
  notRecommended: number;
}) {
  const total = recommended + notRecommended;
  const positivePercent = percent(recommended, total);
  const negativePercent = total ? 100 - positivePercent : 0;
  return (
    <div className={styles.container}>
      <div
        className={styles.track}
        role="img"
        aria-label={
          total
            ? `추천 ${recommended} (${formatPercent(positivePercent)}), 비추천 ${notRecommended} (${formatPercent(negativePercent)})`
            : '추천·비추천 평가가 아직 없어요'
        }
      >
        <span className={styles.positive} style={{ width: `${positivePercent}%` }} />
        <span className={styles.negative} style={{ width: `${negativePercent}%` }} />
      </div>
      <div className={styles.legend}>
        <span>
          <RecommendationIcon recommended={true} />
          추천 {recommended}
        </span>
        <span>
          <RecommendationIcon recommended={false} />
          비추천 {notRecommended}
        </span>
      </div>
    </div>
  );
}
