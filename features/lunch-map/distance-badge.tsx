import { formatDistance } from '@/lib/distance';
import styles from './distance-badge.module.css';

/** Distance from the office, as a small tinted badge ("210m", "1.1km"). */
export default function DistanceBadge({
  distance,
  className,
}: {
  distance: Parameters<typeof formatDistance>[0];
  className?: string;
}) {
  return (
    <span className={className ? `${styles.badge} ${className}` : styles.badge}>
      {formatDistance(distance)}
    </span>
  );
}
