import Link from 'next/link';
import RankingList from '@/features/ranking/ranking-list';
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

export const metadata = { title: '점심 랭킹 | Lunch Map' };

const TABS = [
  { type: 'lunch', href: '/ranking', title: '점심' },
  { type: 'review', href: '/ranking?type=review', title: '리뷰' },
  { type: 'recommendation', href: '/ranking?type=recommendation', title: '추천' },
] as const;
type RankingType = (typeof TABS)[number]['type'];

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const requested = (await searchParams).type;
  const selected: RankingType = TABS.find((tab) => tab.type === requested)?.type ?? 'lunch';
  await connection();
  const db = getDb();
  // Wide screens show all rankings side by side; narrow screens show the selected tab only.
  const [lunchRows, reviewRows, recommendationRows] = await Promise.all([
    getLunchRanking(db),
    getRestaurantRanking(db),
    getRecommendationRanking(db),
  ]);
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="LUNCH MAP RANKING"
        title="점심 랭킹"
        description="인기 식당을 만나보세요."
      />
      <nav className={styles.tabs} aria-label="랭킹 분류">
        {TABS.map((tab) => (
          <Link
            key={tab.type}
            href={tab.href}
            aria-current={tab.type === selected ? 'page' : undefined}
          >
            {tab.title} TOP {RANKING_LIMIT}
          </Link>
        ))}
      </nav>
      <div className={styles.columns}>
        <RankingPanel
          title="점심"
          note={`최근 ${LUNCH_RANKING_DAYS}일`}
          label="오늘의 점심으로 많이 고른 식당 순위"
          empty={`최근 ${LUNCH_RANKING_DAYS}일 동안 오늘의 점심 기록이 없어요.`}
          rows={lunchRows}
          active={selected === 'lunch'}
        />
        <RankingPanel
          title="리뷰"
          label="리뷰 많은 식당 순위"
          empty="아직 리뷰가 등록된 식당이 없어요."
          rows={reviewRows}
          active={selected === 'review'}
        />
        <RankingPanel
          title="추천"
          label="추천 식당 순위"
          empty="아직 추천·비추천 평가가 있는 식당이 없어요."
          rows={recommendationRows}
          active={selected === 'recommendation'}
        />
      </div>
    </main>
  );
}

function RankingPanel({
  title,
  note,
  label,
  empty,
  rows,
  active,
}: {
  title: string;
  note?: string;
  label: string;
  empty: string;
  rows: RankedRestaurant[] | LunchRankedRestaurant[];
  active: boolean;
}) {
  return (
    <section className={styles.panel} aria-label={label} data-active={active || undefined}>
      <div className={styles.heading}>
        <h2>
          {title} TOP {RANKING_LIMIT}
        </h2>
        {note && <span className="subtle">{note}</span>}
      </div>
      {rows.length ? <RankingList rows={rows} /> : <p className={styles.empty}>{empty}</p>}
    </section>
  );
}
