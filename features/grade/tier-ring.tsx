import type { TierId } from '@/lib/grades/model';
import TierIcon, { tierColorVars } from './tier-icon';
import styles from './tier.module.css';

// Drawn on a 72-unit box so it scales with its slot (72px wide screens, 56px phones):
// a 4-unit ring, a 2-unit gap and the crest in the middle 60 units.
const BOX = 72;
const STROKE = 4;
const RADIUS = (BOX - STROKE) / 2;

/**
 * The crest inside a ring that fills toward the next tier in the tier's color. `progress` is
 * 0 to 1, null at the top tier (a full ring) or undefined while the score is loading (no fill).
 * Fills the parent, which sets the size.
 */
export default function TierRing({
  tier,
  progress,
}: {
  tier: TierId;
  progress: number | null | undefined;
}) {
  const top = progress === null;
  const fill = top ? 1 : (progress ?? 0);
  return (
    <span className={styles.ring} style={tierColorVars(tier)}>
      <svg viewBox={`0 0 ${BOX} ${BOX}`} aria-hidden="true" data-top={top || undefined}>
        <circle className={styles['ring-track']} cx={BOX / 2} cy={BOX / 2} r={RADIUS} />
        <circle
          className={styles['ring-fill']}
          cx={BOX / 2}
          cy={BOX / 2}
          r={RADIUS}
          pathLength={1}
          // A round cap would still draw a dot at 0, so an empty ring hides the fill.
          strokeDasharray={`${fill} 1`}
          opacity={fill > 0 ? 1 : 0}
        />
      </svg>
      <span className={styles['ring-crest']}>
        <TierIcon tier={tier} />
      </span>
    </span>
  );
}
