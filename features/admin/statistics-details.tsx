import ReviewCountBadges from '@/features/reviews/review-counts';
import {
  LUNCH_RANKING_DAYS,
  RECOMMENDATION_WEIGHT,
  RECOMMENDATION_SMOOTHING,
} from '@/lib/ranking/constants';
import type { AdminStatistics } from '@/lib/admin/statistics-types';
import styles from './admin-statistics.module.css';

export default function StatisticsDetails({ data }: { data: AdminStatistics }) {
  const total = data.recentDays.reduce((sum, day) => sum + day.count, 0);
  const max = Math.max(1, ...data.recentDays.map((day) => day.count));
  return (
    <>
      <div className={styles.section}>
        <div className={styles.heading}>
          <h3>최근 7일 리뷰</h3>
          <strong>총 {total.toLocaleString()}개</strong>
        </div>
        <p className="subtle">한국 시간 · 오늘 포함 · 작성일 기준 · 삭제된 리뷰 제외</p>
        <ol className={styles.days} aria-label="최근 7일 날짜별 리뷰 수">
          {data.recentDays.map((day) => (
            <li key={day.date} aria-label={`${day.date} 리뷰 ${day.count}개`}>
              <strong aria-hidden="true">{day.count}</strong>
              <div className={styles.dayTrack} aria-hidden="true">
                <span style={{ height: `${(day.count / max) * 100}%` }} />
              </div>
              <time dateTime={day.date} aria-hidden="true">
                {day.date.slice(5).replace('-', '/')}
              </time>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.section}>
        <h3>리뷰 많은 식당 TOP 10</h3>
        <p className="subtle">전체 기간 · 비활성 식당 포함 · 같은 개수는 식당명 순</p>
        {data.topRestaurants.length ? (
          <ol className={styles.ranking}>
            {data.topRestaurants.map((row, index) => (
              <li key={row.id}>
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.restaurantName}>
                  {row.name}
                  {!row.active && <small> · 비활성</small>}
                </span>
                <strong>{row.count.toLocaleString()}개</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="subtle">아직 작성된 리뷰가 없습니다.</p>
        )}
      </div>
      <div className={styles.section}>
        <h3>추천 많은 식당 TOP 10</h3>
        <p className="subtle">전체 기간 · 비활성 식당 포함 · 추천 점수 순</p>
        <p className="subtle">
          추천 점수 = (추천 수 × {RECOMMENDATION_WEIGHT}) ÷ (추천 수 × {RECOMMENDATION_WEIGHT} +
          비추천 수 + {RECOMMENDATION_SMOOTHING}) × 100
          <br />
          추천에 {RECOMMENDATION_WEIGHT}배 가중치를 적용하고, 평가가 적은 식당의 점수가 과도하게
          높아지지 않도록 보정값 {RECOMMENDATION_SMOOTHING}을 더합니다. 실제 추천 비율이 아닌 순위
          산정용 점수입니다.
        </p>
        {data.topRecommendedRestaurants.length ? (
          <ol className={styles.ranking}>
            {data.topRecommendedRestaurants.map((row) => (
              <li key={row.id} value={row.rank}>
                <span className={styles.rank}>{row.rank}</span>
                <span className={styles.restaurantName}>
                  {row.name}
                  {!row.active && <small> · 비활성</small>}
                </span>
                <div className={styles.scoreDetails}>
                  <strong aria-label={`추천 점수 ${row.score.toFixed(1)}퍼센트`}>
                    {row.score.toFixed(1)}%
                  </strong>
                  <ReviewCountBadges counts={row} colored />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="subtle">아직 추천·비추천 평가가 있는 식당이 없습니다.</p>
        )}
      </div>
      <div className={styles.section}>
        <h3>오늘의 점심 TOP 10</h3>
        <p className="subtle">
          최근 {LUNCH_RANKING_DAYS}일 · 한국 시간 · 오늘 포함 · 비활성 식당 포함 · 같은 횟수는 고른
          사람 수 순
        </p>
        {data.topLunchRestaurants.length ? (
          <ol className={styles.ranking}>
            {data.topLunchRestaurants.map((row) => (
              <li key={row.id} value={row.rank}>
                <span className={styles.rank}>{row.rank}</span>
                <span className={styles.restaurantName}>
                  {row.name}
                  {!row.active && <small> · 비활성</small>}
                </span>
                <strong>
                  {row.visits.toLocaleString()}회 · {row.people.toLocaleString()}명
                </strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="subtle">최근 {LUNCH_RANKING_DAYS}일 동안 오늘의 점심 기록이 없습니다.</p>
        )}
      </div>
    </>
  );
}
