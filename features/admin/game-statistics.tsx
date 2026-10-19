import type { GameStatistics } from '@/lib/admin/statistics-types';
import { GAME_LABELS, GAMES } from '@/lib/game-plays/model';
import DayBarChart from './day-bar-chart';
import styles from './admin-statistics.module.css';

const BAR_CLASS = { slot: styles.slotBar, lunch_box: styles.boxBar };

/** Game plays in the admin statistics: totals per game and a 7-day grouped bar chart. */
export default function GameStatisticsSection({ games }: { games: GameStatistics | null }) {
  if (!games)
    return (
      <div className={styles.section}>
        <h3>게임 플레이</h3>
        <p className="subtle">
          게임 횟수를 불러오지 못했어요. game_play_daily 테이블이 있는지 확인해 주세요.
        </p>
      </div>
    );
  return (
    <div className={styles.section}>
      <h3>게임 플레이</h3>
      <div className={styles.cards}>
        {GAMES.map((game) => (
          <div key={game}>
            <span>{GAME_LABELS[game]} 총 플레이</span>
            <strong>{games.totals[game].toLocaleString()}</strong>
            <small>전체 기간 · 팝업을 닫을 때 저장</small>
          </div>
        ))}
      </div>
      <div className={`${styles.heading} ${styles.gameHeading}`}>
        <h3>최근 7일 게임 플레이</h3>
        <ul className={styles.legend}>
          {GAMES.map((game) => (
            <li key={game}>
              <span className={BAR_CLASS[game]} aria-hidden="true" />
              {GAME_LABELS[game]}
            </li>
          ))}
        </ul>
      </div>
      <p className="subtle">한국 시간 · 오늘 포함</p>
      <DayBarChart
        label="최근 7일 날짜별 게임 플레이 수"
        summaryClassName={styles.gameCounts}
        trackClassName={styles.gameTrack}
        days={games.recentDays.map((day) => ({
          date: day.date,
          label: `${day.date} ${GAMES.map((game) => `${GAME_LABELS[game]} ${day[game]}판`).join(', ')}`,
          summary: GAMES.map((game) => day[game]).join(' · '),
          bars: GAMES.map((game) => ({ value: day[game], className: BAR_CLASS[game] })),
        }))}
      />
    </div>
  );
}
