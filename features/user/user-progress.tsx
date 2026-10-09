import ProgressBar from '@/components/ui/progress-bar';
import LoadingStatus from '@/components/ui/loading-status';
import styles from './user.module.css';
import RecommendationBar from '@/features/reviews/recommendation-bar';
import type { UserReviewStats } from '@/lib/reviews/model';
import { formatPercent, percent } from '@/lib/percent';

export default function UserProgress({
  stats,
  loading,
}: {
  stats: UserReviewStats | null;
  loading: boolean;
}) {
  if (!stats)
    return (
      <section className={styles['user-progress']} aria-label="점심 통계">
        {loading ? (
          <LoadingStatus label="점심 통계를 불러오는 중…" />
        ) : (
          <p className="subtle" role="status">
            점심 통계를 불러오지 못했어요.
          </p>
        )}
      </section>
    );
  // A restaurant counts once whether it was reviewed, picked as 오늘의 점심, or both.
  const progress = percent(stats.visited_active, stats.active_total);
  const breakdown = `리뷰 ${stats.reviewed_active} · 오늘의 점심 ${stats.lunched_active}`;
  const rated = stats.recommended_active + stats.not_recommended_active;
  return (
    <section className={styles['user-progress']} aria-label="점심 통계">
      <div>
        <div className={styles['user-progress-heading']}>
          <h2>점심 탐방 진행률</h2>
          <strong>{formatPercent(progress)}</strong>
        </div>
        <ProgressBar
          value={progress}
          label="점심 탐방 진행률"
          valueText={`식당 ${stats.active_total}곳 중 ${stats.visited_active}곳 (${breakdown})`}
        />
        <p className="subtle">{stats.active_total ? breakdown : '집계할 식당이 없어요'}</p>
      </div>
      <div>
        <div className={styles['user-progress-heading']}>
          <h2>내 리뷰 성향</h2>
        </div>
        <RecommendationBar
          recommended={stats.recommended_active}
          notRecommended={stats.not_recommended_active}
        />
        {!rated && stats.reviewed_active > 0 && (
          <p className="subtle">추천·비추천 평가가 아직 없어요.</p>
        )}
      </div>
    </section>
  );
}
