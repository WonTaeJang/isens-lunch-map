'use client';

import type { ComponentProps } from 'react';
import { BookmarkIcon } from '@/components/ui/icons';
import styles from './favorite-toggle.module.css';

type Props = Omit<ComponentProps<'button'>, 'children' | 'aria-pressed'> & {
  selected: boolean;
  restaurantName: string;
  /** 'small' is 32px (default); 'large' is 40px. `className` is for placement only. */
  size?: 'small' | 'large';
};

export default function FavoriteToggle({
  selected,
  restaurantName,
  size = 'small',
  className,
  ...props
}: Props) {
  const label = `${restaurantName} 즐겨찾기 ${selected ? '해제' : '추가'}`;
  const classes = [styles.toggle, size === 'large' && styles.large, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={classes}
      aria-pressed={selected}
    >
      <BookmarkIcon fill={selected ? '#ffd338' : 'none'} />
    </button>
  );
}
