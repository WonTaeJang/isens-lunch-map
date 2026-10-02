'use client';

import type { ComponentProps } from 'react';

type Props = Omit<ComponentProps<'button'>, 'children' | 'aria-pressed'> & {
  selected: boolean;
  restaurantName: string;
};

export default function FavoriteToggle({ selected, restaurantName, ...props }: Props) {
  const label = `${restaurantName} 즐겨찾기 ${selected ? '해제' : '추가'}`;
  return (
    <button type="button" aria-label={label} title={label} {...props} aria-pressed={selected}>
      <svg
        width="18"
        height="20"
        viewBox="0 0 18 22"
        fill={selected ? '#ffd338' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M3 2h12v18l-6-4-6 4z" />
      </svg>
    </button>
  );
}
