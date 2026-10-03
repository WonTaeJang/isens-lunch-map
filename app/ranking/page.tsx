import Link from 'next/link';
import RankingList from '@/features/ranking/ranking-list';
import { RANKING_LIMIT } from '@/features/ranking/constants';
import { connection } from 'next/server';
import PageHeading from '@/components/ui/page-heading';
import { getDb } from '@/lib/server/db';
import { getRestaurantRanking, getRecommendationRanking } from '@/lib/server/ranking';
import styles from '@/features/ranking/ranking.module.css';

export const metadata = { title: '식당 랭킹 | Lunch Map' };

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  const recommendation = (await searchParams).type === 'recommendation';
  await connection();
  const rows = await (recommendation
    ? getRecommendationRanking(getDb())
    : getRestaurantRanking(getDb()));
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="LUNCH MAP RANKING"
        title="식당 랭킹"
        description="리뷰와 추천으로 인기 식당을 만나보세요."
      />
      <nav className={styles.tabs} aria-label="랭킹 분류">
        <Link href="/ranking" aria-current={!recommendation ? 'page' : undefined}>
          리뷰 TOP {RANKING_LIMIT}
        </Link>
        <Link
          href="/ranking?type=recommendation"
          aria-current={recommendation ? 'page' : undefined}
        >
          추천 TOP {RANKING_LIMIT}
        </Link>
      </nav>
      <section
        className={styles.panel}
        aria-label={recommendation ? '추천 식당 순위' : '리뷰 많은 식당 순위'}
      >
        <div className={styles.heading}>
          <h2>
            {recommendation ? '추천' : '리뷰'} TOP {RANKING_LIMIT}
          </h2>
        </div>
        {rows.length ? (
          <RankingList rows={rows} />
        ) : (
          <p className={styles.empty}>
            {recommendation
              ? '아직 추천·비추천 평가가 있는 식당이 없어요.'
              : '아직 리뷰가 등록된 식당이 없어요.'}
          </p>
        )}
      </section>
    </main>
  );
}
