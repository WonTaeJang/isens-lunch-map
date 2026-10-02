'use client';

import type { ComponentProps } from 'react';
import { BookmarkIcon } from '@/components/ui/icons';

type Props = Omit<ComponentProps<'button'>, 'children' | 'aria-pressed'> & {
  selected: boolean;
  restaurantName: string;
};

export default function FavoriteToggle({ selected, restaurantName, ...props }: Props) {
  const label = `${restaurantName} 즐겨찾기 ${selected ? '해제' : '추가'}`;
  return (
    <button type="button" aria-label={label} title={label} {...props} aria-pressed={selected}>
      <BookmarkIcon fill={selected ? '#ffd338' : 'none'} />
    </button>
  );
}
