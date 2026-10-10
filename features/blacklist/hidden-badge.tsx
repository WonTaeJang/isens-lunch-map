import { EyeOffIcon } from '@/components/ui/icons';
import styles from './hidden-badge.module.css';

/** Small "숨김" mark next to the name of a restaurant the viewer hid. */
export default function HiddenBadge() {
  return (
    <span className={styles.badge} title="내가 숨긴 식당">
      <EyeOffIcon size={11} strokeWidth="2.2" />
      숨김
    </span>
  );
}
