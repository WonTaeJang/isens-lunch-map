import LoadingSpinner from './loading-spinner';
import styles from './loading.module.css';

export default function LoadingStatus({
  label = '불러오는 중…',
  page = false,
}: {
  label?: string;
  page?: boolean;
}) {
  return (
    <div className={`${styles.status} ${styles.delayed} ${page ? styles.page : ''}`} role="status">
      <LoadingSpinner size={page ? 40 : 24} delayed={false} />
      <span>{label}</span>
    </div>
  );
}
