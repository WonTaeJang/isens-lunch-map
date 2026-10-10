'use client';

import { useId, useState } from 'react';
import FavoriteToggle from './favorite-toggle';
import useFavorites from './use-favorites';
import { toggleStoredFavorite } from './favorites-store';
import styles from './favorite-button.module.css';

type Props = {
  restaurantId: string;
  restaurantName: string;
  /** 'small' is 32px (default); 'large' is 40px. */
  size?: 'small' | 'large';
  disabled?: boolean;
};

export default function FavoriteButton({
  restaurantId,
  restaurantName,
  size = 'small',
  disabled = false,
}: Props) {
  const favorites = useFavorites();
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const selected = favorites.has(restaurantId);
  return (
    <span className={styles.container}>
      <FavoriteToggle
        restaurantName={restaurantName}
        selected={selected}
        size={size}
        disabled={disabled}
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
