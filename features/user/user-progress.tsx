import RecommendationIcon from '@/features/reviews/recommendation-icon';
import type { UserReviewStats } from '@/features/reviews/review-model';

export function percent(part: number, total: number) {
  return total > 0 ? Math.min(100, Math.max(0, part / total * 100)) : 0;
}
const PERCENT_FORMAT = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

export default function UserProgress({ stats, loading }: { stats: UserReviewStats | null; loading: boolean }) {
  if (!stats) return <section className="user-progress" aria-label="점심 통계"><p className="subtle" role="status">{loading ? '점심 통계를 불러오는 중…' : '점심 통계를 불러오지 못했습니다.'}</p></section>;
  const progress = percent(stats.reviewed_active, stats.active_total);
  const rated = stats.recommended_active + stats.not_recommended_active;
  const recommended = percent(stats.recommended_active, rated);
  const notRecommended = rated ? 100 - recommended : 0;
  return <section className="user-progress" aria-label="점심 통계">
    <div className="user-progress-block">
      <div className="user-progress-heading"><h2>점심 탐방 진행률</h2><strong>{PERCENT_FORMAT.format(progress)}%</strong></div>
      <div className="user-stat-track" role="progressbar" aria-label="점심 탐방 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`식당 ${stats.active_total}곳 중 리뷰 ${stats.reviewed_active}`}><span className="user-stat-progress" style={{ width: `${progress}%` }} /></div>
      <p className="subtle">{stats.active_total ? `리뷰 ${stats.reviewed_active}` : '집계할 식당이 없어요'}</p>
    </div>
    <div className="user-progress-block">
      <div className="user-progress-heading"><h2>내 리뷰 성향</h2></div>
      <div className="user-stat-track" role="img" aria-label={`추천 ${stats.recommended_active} (${PERCENT_FORMAT.format(recommended)}%), 비추천 ${stats.not_recommended_active} (${PERCENT_FORMAT.format(notRecommended)}%)`}>
        <span className="user-stat-recommended" style={{ width: `${recommended}%` }} /><span className="user-stat-not-recommended" style={{ width: `${notRecommended}%` }} />
      </div>
      <div className="user-stat-legend"><span><RecommendationIcon recommended={true} />추천 {stats.recommended_active}</span><span><RecommendationIcon recommended={false} />비추천 {stats.not_recommended_active}</span></div>
      {!rated && <p className="subtle">{stats.reviewed_active ? '추천·비추천 평가가 아직 없어요.' : '아직 리뷰를 작성한 활성 식당이 없어요.'}</p>}
    </div>
  </section>;
}
