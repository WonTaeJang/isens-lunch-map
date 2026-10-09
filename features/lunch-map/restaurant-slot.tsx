import type { CSSProperties } from 'react';
import { WINNER_INDEX } from './random-model';
import styles from './restaurant-slot.module.css';

const ROW_HEIGHT = 56;
const DURATION_MS = 2000;

export default function RestaurantSlot({
  reel,
  placeholder,
  onComplete,
}: {
  reel: { names: string[]; key: number } | null;
  placeholder: string;
  onComplete: () => void;
}) {
  const style = {
    '--slot-row-height': `${ROW_HEIGHT}px`,
    '--slot-duration': `${DURATION_MS}ms`,
    '--slot-offset': `${-(WINNER_INDEX - 1) * ROW_HEIGHT}px`,
  } as CSSProperties;
  return (
    <div className={styles.slot} style={style} aria-hidden="true">
      <div className={styles.selection} />
      {reel ? (
        <div key={reel.key} className={styles.reel} onAnimationEnd={onComplete}>
          {reel.names.map((name, index) => (
            <div className={styles.item} key={index}>
              {name}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.placeholder}>{placeholder}</div>
      )}
    </div>
  );
}
