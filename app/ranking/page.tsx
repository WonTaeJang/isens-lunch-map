import RankingList from '@/features/ranking/ranking-list';
import RankingTabs from '@/features/ranking/ranking-tabs';
import { LUNCH_RANKING_DAYS, RANKING_LIMIT } from '@/lib/ranking/constants';
import type { LunchRankedRestaurant, RankedRestaurant } from '@/lib/ranking/model';
import { connection } from 'next/server';
import PageHeading from '@/components/ui/page-heading';
import { getDb } from '@/lib/server/db';
import {
  getLunchRanking,
  getRestaurantRanking,
  getRecommendationRanking,
} from '@/lib/server/ranking';
import styles from '@/features/ranking/ranking.module.css';
import { BlacklistSeedProvider } from '@/features/blacklist/blacklist-seed';
import { getViewerBlacklist } from '@/lib/server/viewer-blacklist';

export const metadata = { title: '점심 랭킹 | Lunch Map' };

const TABS = [
  { type: 'lunch', href: '/ranking', title: '점심' },
  { type: 'review', href: '/ranking?type=review', title: '리뷰' },
  { type: 'recommendation', href: '/ranking?type=recommendation', title: '추천' },
] as const;

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const requested = (await searchParams).type;
  const selected = Math.max(
    0,
    TABS.findIndex((tab) => tab.type === requested),
  );
  await connection();
  const db = getDb();
  // Wide screens show all rankings side by side; narrow screens swipe between them (RankingTabs).
  // The viewer's hidden restaurants (user cookie) are marked 숨김 from the first render.
  const [lunchRows, reviewRows, recommendationRows, hidden] = await Promise.all([
    getLunchRanking(db),
    getRestaurantRanking(db),
    getRecommendationRanking(db),
    getViewerBlacklist(db),
  ]);
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="LUNCH MAP RANKING"
        title={`랭킹 TOP ${RANKING_LIMIT}`}
        description="인기 식당을 만나보세요."
      />
      <BlacklistSeedProvider seed={hidden}>
        <RankingTabs tabs={TABS} initialIndex={selected}>
          <RankingPanel
            title="점심"
            note={`최근 ${LUNCH_RANKING_DAYS}일`}
            label="오늘의 점심으로 많이 고른 식당 순위"
            empty={`최근 ${LUNCH_RANKING_DAYS}일 동안 오늘의 점심 기록이 없어요.`}
            rows={lunchRows}
          />
          <RankingPanel
            title="리뷰"
            label="리뷰 많은 식당 순위"
            empty="아직 리뷰가 등록된 식당이 없어요."
            rows={reviewRows}
          />
          <RankingPanel
            title="추천"
            label="추천 식당 순위"
            empty="아직 추천·비추천 평가가 있는 식당이 없어요."
            rows={recommendationRows}
          />
        </RankingTabs>
      </BlacklistSeedProvider>
    </main>
  );
}

function RankingPanel({
  title,
  note,
  label,
  empty,
  rows,
}: {
  title: string;
  note?: string;
  label: string;
  empty: string;
  rows: RankedRestaurant[] | LunchRankedRestaurant[];
}) {
  return (
    <section className={styles.panel} aria-label={label}>
      <div className={styles.heading}>
        <h2>{title}</h2>
        {note && <span className="subtle">{note}</span>}
      </div>
      {rows.length ? <RankingList rows={rows} /> : <p className={styles.empty}>{empty}</p>}
    </section>
  );
}
