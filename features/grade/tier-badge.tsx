import { tierById, type TierId } from '@/lib/grades/model';
import { tierColorVars } from './tier-icon';
import styles from './tier.module.css';

/** The tier name in a small pill of the tier's colors. */
export default function TierBadge({ tier }: { tier: TierId }) {
  return (
    <span className={styles.badge} style={tierColorVars(tier)}>
      {tierById(tier).name}
    </span>
  );
}
