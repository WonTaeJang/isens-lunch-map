import { CheckIcon } from '@/components/ui/icons';
import styles from './reviewed-badge.module.css';

export default function ReviewedBadge() {
  return (
    <span className={styles.badge} role="img" aria-label="내 리뷰 작성됨" title="내 리뷰 작성됨">
      <CheckIcon size={12} />
    </span>
  );
}
