'use client';

import Link from 'next/link';
import { useState } from 'react';
import FavoriteToggle from '@/features/favorites/favorite-toggle';
import { toggleStoredFavorite } from '@/features/favorites/favorites-store';
import DistanceBadge from '@/features/lunch-map/distance-badge';
import list from '@/features/reviews/review-list.module.css';
import { hasCoordinates } from '@/lib/coordinates';
import { restaurantMapHref } from '@/lib/map-link';
import type { RestaurantRow } from '@/lib/restaurant-types';
import styles from './user.module.css';

/** 즐겨찾기 tab: favorite restaurants (active ones first); un-favoriting removes a row. */
export default function UserFavoritesTab({
  restaurants,
  favorites,
}: {
  restaurants: RestaurantRow[];
  favorites: ReadonlySet<string>;
}) {
  const [favoriteError, setFavoriteError] = useState('');
  const savedRestaurants = restaurants
    .filter((row) => favorites.has(row.id))
    .sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)));
  return (
    <section className={styles.userRecords} aria-label="즐겨찾기 식당">
      {favoriteError && (
        <p className="error-text" role="alert">
          {favoriteError}
        </p>
      )}
      {!savedRestaurants.length && (
        <p className={list.empty}>
          즐겨찾기한 식당이 없어요.{' '}
          <Link href="/" className="text-link">
            식당 찾아보기
          </Link>
        </p>
      )}
      <ul className={`${list.list} ${styles.userList}`}>
        {savedRestaurants.map((row) => (
          <li
            className={`${list.item} ${styles.userItem}${row.active ? '' : ` ${styles.userRestaurantInactive}`}`}
            key={row.id}
          >
            <div className={`${list.itemHeading} ${styles.userItemHeading}`}>
              <div className={styles.favoriteTitle}>
                <FavoriteToggle
                  restaurantName={row.name}
                  selected={favorites.has(row.id)}
                  onClick={() => setFavoriteError(toggleStoredFavorite(row.id) ?? '')}
                />
                <h2>
                  {row.active && hasCoordinates(row) ? (
                    <Link href={restaurantMapHref(row.id)}>{row.name}</Link>
                  ) : (
                    row.name
                  )}
                </h2>
              </div>
              <DistanceBadge distance={row.distance} className={styles.userDistance} />
            </div>
            <p className={`description ${styles.userDescription}`}>
              {row.category} · {row.main_menu}
            </p>
            <p className={`description ${styles.userDescription}`}>
              {row.address || '주소 확인 필요'}
            </p>
            {!row.active && <p className="subtle">현재 비활성 식당이에요.</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
