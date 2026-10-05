'use client';

import { useState } from 'react';
import { BowlChopsticksIcon } from '@/components/ui/icons';
import styles from './today-lunch-button.module.css';

type Props = {
  restaurantName: string;
  /** This restaurant is today's lunch. */
  active: boolean;
  busy: boolean;
  /** Records, changes or cancels; `chosen` is true only when it just became today's lunch. */
  onToggle: () => Promise<{ chosen: boolean }>;
  /** 'small' is 32px (default, cards and lists); 'large' is 40px. */
  size?: 'small' | 'large';
};

/** "오늘의 점심" icon button with a short burst when a restaurant is chosen. */
export default function TodayLunchButton({
  restaurantName,
  active,
  busy,
  onToggle,
  size = 'small',
}: Props) {
  // Bumped on every successful check so the burst animation restarts each time.
  const [burst, setBurst] = useState(0);
  return (
    <button
      type="button"
      className={size === 'large' ? `${styles.button} ${styles.large}` : styles.button}
      title={active ? '오늘의 점심 취소' : '오늘의 점심으로 기록'}
      aria-pressed={active}
      aria-busy={busy || undefined}
      aria-label={`${restaurantName} ${active ? '오늘의 점심 취소' : '오늘의 점심으로 기록'}`}
      data-burst={burst % 2 === 1 ? 'odd' : burst > 0 ? 'even' : undefined}
      onClick={async () => {
        if (busy) return;
        const { chosen } = await onToggle();
        if (chosen) setBurst((value) => value + 1);
      }}
    >
      <BowlChopsticksIcon size={20} />
    </button>
  );
}
