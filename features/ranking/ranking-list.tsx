'use client';

import Link from 'next/link';
import FavoriteButton from '@/features/favorites/favorite-button';
import ReviewCountBadges from '@/features/reviews/review-counts';
import useOwnReviews from '@/features/reviews/use-own-reviews';
import useBlacklist from '@/features/blacklist/use-blacklist';
import HiddenBadge from '@/features/blacklist/hidden-badge';
import { hasCoordinates } from '@/lib/coordinates';
import { restaurantMapHref } from '@/lib/map-link';
import type { LunchRankedRestaurant, RankedRestaurant } from '@/lib/ranking/model';
import styles from './ranking.module.css';

export default function RankingList({
  rows,
}: {
  rows: readonly (RankedRestaurant | LunchRankedRestaurant)[];
}) {
  // Every ranking list on the page shares one lookup of the viewer's own 추천/비추천.
  const own = useOwnReviews();
  // Restaurants the viewer hid stay ranked, marked 숨김 and without links or buttons.
  const hidden = useBlacklist().ids;
  return (
    <ol className={styles.list}>
      {rows.map((row) => {
        const isHidden = hidden?.has(row.id) ?? false;
        const onMap = hasCoordinates(row) && !isHidden;
        return (
          <li
            key={row.id}
            value={row.rank}
            data-top={row.rank <= 3 || undefined}
            data-hidden={isHidden || undefined}
          >
            <span className={styles.rank}>{row.rank}</span>
            <div className={styles.content}>
              <div className={styles.title}>
                <FavoriteButton
                  restaurantId={row.id}
                  restaurantName={row.name}
                  disabled={isHidden}
                />
                <h3>
                  {onMap ? <Link href={restaurantMapHref(row.id)}>{row.name}</Link> : row.name}
                  {isHidden && <HiddenBadge />}
                </h3>
              </div>
              <div className={styles.counts}>
                <div className={styles.details}>
                  <strong>
                    {'visits' in row ? (
                      `${row.visits}회 · ${row.people}명`
                    ) : onMap ? (
                      <Link
                        href={restaurantMapHref(row.id, { reviews: true })}
                        aria-label={`${row.name} 리뷰 ${row.reviews}개 보기`}
                      >
                        리뷰 {row.reviews}
                      </Link>
                    ) : (
                      `리뷰 ${row.reviews}`
                    )}
                  </strong>
                  <span className="subtle">{row.category}</span>
                </div>
                <div className={styles.votes}>
                  <ReviewCountBadges counts={row} mine={own?.choices.get(row.id) ?? null} />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
