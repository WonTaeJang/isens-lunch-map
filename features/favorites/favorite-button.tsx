'use client';

import { useId, useState } from 'react';
import FavoriteToggle from './favorite-toggle';
import useFavorites from './use-favorites';
import { toggleStoredFavorite } from './favorites-store';
import styles from './favorite-button.module.css';

type Props = { restaurantId: string; restaurantName: string };

export default function FavoriteButton({ restaurantId, restaurantName }: Props) {
  const favorites = useFavorites();
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const selected = favorites.has(restaurantId);
  return (
    <span className={styles.container}>
      <FavoriteToggle
        restaurantName={restaurantName}
        selected={selected}
        className={styles.button}
        aria-describedby={error ? errorId : undefined}
        onClick={() => setError(toggleStoredFavorite(restaurantId))}
      />
      {error && (
        <span id={errorId} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </span>
  );
}
