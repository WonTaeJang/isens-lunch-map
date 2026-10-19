'use client';

import { BookmarkIcon, BowlChopsticksIcon } from '@/components/ui/icons';
import ReviewedBadge from '@/features/reviews/reviewed-badge';
import type { MapRestaurant } from '@/lib/restaurant-types';
import type { ReactNode } from 'react';
import DistanceBadge from './distance-badge';
import { favoritesFirst } from './coordinate-groups';
import cardStyles from './restaurant-map-card.module.css';
import styles from './restaurant-group-card.module.css';

type Props = {
  /** Restaurants at the same coordinates, sorted by name. */
  rows: MapRestaurant[];
  favorites: ReadonlySet<string>;
  reviewedIds: ReadonlySet<string> | null;
  /** Today's lunch restaurant, marked in the list. */
  todayLunchId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
};

/** Opened from a number circle on the map; picking a row opens its usual card. */
export default function RestaurantGroupCard({
  rows,
  favorites,
  reviewedIds,
  todayLunchId,
  onPick,
  onClose,
}: Props) {
  const title = `여기 모인 식당 ${rows.length}곳`;
  return (
    <article
      className={`${cardStyles.card} ${styles.card}`}
      aria-label={`${title} 목록`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <button type="button" className={cardStyles.close} aria-label="목록 닫기" onClick={onClose}>
        ×
      </button>
      <div className={cardStyles.header}>
        <h3>{title}</h3>
      </div>
      <div className={cardStyles.meta}>
        <DistanceBadge distance={rows[0].distance} />
        <span className={styles.address}>{rows[0].address || '주소 확인 필요'}</span>
      </div>
      <ul className={styles.list}>
        {favoritesFirst(rows, favorites).map((row) => {
          const todayLunch = row.id === todayLunchId;
          return (
            <li key={row.id}>
              <button
                type="button"
                className={styles.item}
                data-today-lunch={todayLunch || undefined}
                onClick={() => onPick(row.id)}
              >
                <span className={styles.name}>{row.name}</span>
                {todayLunch && (
                  <Mark label="오늘의 점심" className={styles.todayLunch}>
                    <BowlChopsticksIcon size={14} />
                  </Mark>
                )}
                {favorites.has(row.id) && (
                  <Mark label="즐겨찾기" className={styles.favorite}>
                    <BookmarkIcon size={14} />
                  </Mark>
                )}
                {reviewedIds?.has(row.id) && <ReviewedBadge />}
                <span className={styles.category}>{row.category || '분류 정보 없음'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

/** A small labeled icon after a restaurant name. */
function Mark({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <span className={`${styles.mark} ${className}`} role="img" aria-label={label} title={label}>
      {children}
    </span>
  );
}
