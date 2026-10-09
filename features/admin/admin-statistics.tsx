'use client';

import useAdminStatistics from './use-admin-statistics';
import StatisticsDetails from './statistics-details';
import ProgressBar from '@/components/ui/progress-bar';
import Button from '@/components/ui/button';
import LoadingStatus from '@/components/ui/loading-status';
import RecommendationBar from '@/features/reviews/recommendation-bar';
import { percent } from '@/features/user/progress-model';
import styles from './admin-statistics.module.css';

/** Share of active restaurants covered by one kind of record (reviews, 오늘의 점심). */
function CoverageProgress({
  title,
  covered,
  total,
  description,
}: {
  title: string;
  covered: number;
  total: number;
  description: string;
}) {
  const progress = percent(covered, total);
  return (
    <div className={styles.section}>
      <div className={styles.heading}>
        <h3>{title}</h3>
        <strong>{progress.toFixed(1)}%</strong>
      </div>
      <ProgressBar
        className={styles.track}
        value={progress}
        label={title}
        valueText={`활성 식당 ${total}곳 중 ${covered}곳`}
      />
      <p className="subtle">{description}</p>
    </div>
  );
}

export default function AdminStatistics({ password }: { password: string }) {
  const { data, error, loading, reload } = useAdminStatistics(password);
  const maxTag = Math.max(1, ...(data?.tags.map((tag) => tag.count) ?? []));
  return (
    <section className="table-section" aria-label="리뷰 통계" aria-busy={loading}>
      <div className={styles.heading}>
        <h2>통계</h2>
        <Button variant="secondary" disabled={loading} onClick={reload}>
          새로고침
        </Button>
      </div>
      {error && (
        <p role="alert" className="review-error">
          {error}
        </p>
      )}
      {loading && !data && <LoadingStatus label="통계를 불러오는 중…" />}
      {data && (
        <>
          <div className={styles.cards}>
            <div>
              <span>총 사용자 수</span>
              <strong>{data.users.toLocaleString()}</strong>
              <small>리뷰 작성자 ID 기준</small>
            </div>
            <div>
              <span>리뷰 총 개수</span>
              <strong>{data.reviews.toLocaleString()}</strong>
              <small>비활성 식당 리뷰 포함</small>
            </div>
          </div>
          <CoverageProgress
            title="점심 탐방 진행률 · 리뷰"
            covered={data.reviewedRestaurants}
            total={data.activeRestaurants}
            description={`활성 식당 ${data.activeRestaurants}곳 중 ${data.reviewedRestaurants}곳에 리뷰가 있어요.`}
          />
          <CoverageProgress
            title="점심 탐방 진행률 · 오늘의 점심"
            covered={data.lunchedRestaurants}
            total={data.activeRestaurants}
            description={`활성 식당 ${data.activeRestaurants}곳 중 ${data.lunchedRestaurants}곳이 오늘의 점심으로 선택됐어요.`}
          />
          <div className={styles.section}>
            <h3>전체 리뷰 성향</h3>
            <RecommendationBar
              recommended={data.recommended}
              notRecommended={data.notRecommended}
            />
            {data.reviews > data.recommended + data.notRecommended && (
              <p className="subtle">
                평가 없는 리뷰 {data.reviews - data.recommended - data.notRecommended}개는 비율에서
                제외됩니다.
              </p>
            )}
          </div>
          <StatisticsDetails data={data} />
          <div className={styles.section}>
            <h3>태그 사용 횟수</h3>
            <p className="subtle">
              해당 태그를 선택한 리뷰 수 · 여러 태그를 선택한 리뷰는 각각 집계됩니다.
            </p>
            <ul className={styles.tags}>
              {data.tags.map((tag) => (
                <li key={tag.value}>
                  <div className={styles.heading}>
                    <span>{tag.label}</span>
                    <strong>{tag.count.toLocaleString()}</strong>
                  </div>
                  <ProgressBar className={styles.track} value={(tag.count / maxTag) * 100} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
