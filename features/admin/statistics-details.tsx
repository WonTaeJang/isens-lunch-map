import type { AdminStatistics } from './statistics-model';
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
        <details className={styles.unreviewed}>
          <summary>
            리뷰 없는 활성 식당 <strong>{data.unreviewedRestaurants.length}곳</strong>
          </summary>
          {data.unreviewedRestaurants.length ? (
            <ul>
              {data.unreviewedRestaurants.map((row) => (
                <li key={row.id}>{row.name}</li>
              ))}
            </ul>
          ) : (
            <p className="subtle">리뷰 없는 활성 식당이 없습니다.</p>
          )}
        </details>
      </div>
    </>
  );
}
