import Link from 'next/link';
import FavoriteButton from '@/features/favorites/favorite-button';
import ReviewCountBadges from '@/features/reviews/review-counts';
import { hasCoordinates } from '@/lib/coordinates';
import { restaurantMapHref } from '@/lib/map-link';
import type { LunchRankedRestaurant, RankedRestaurant } from '@/lib/ranking/model';
import styles from './ranking.module.css';

export default function RankingList({
  rows,
}: {
  rows: readonly (RankedRestaurant | LunchRankedRestaurant)[];
}) {
  return (
    <ol className={styles.list}>
      {rows.map((row) => (
        <li key={row.id} value={row.rank} data-top={row.rank <= 3 || undefined}>
          <span className={styles.rank}>{row.rank}</span>
          <div className={styles.content}>
            <div className={styles.title}>
              <FavoriteButton restaurantId={row.id} restaurantName={row.name} />
              <h3>
                {hasCoordinates(row) ? (
                  <Link href={restaurantMapHref(row.id)}>{row.name}</Link>
                ) : (
                  row.name
                )}
              </h3>
            </div>
            <div className={styles.counts}>
              <div className={styles.details}>
                <strong>
                  {'visits' in row ? `${row.visits}회 · ${row.people}명` : `리뷰 ${row.reviews}`}
                </strong>
                <span className="subtle">{row.category}</span>
              </div>
              <div className={styles.votes}>
                <ReviewCountBadges counts={row} colored />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
