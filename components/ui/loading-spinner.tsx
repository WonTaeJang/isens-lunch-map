import Image from 'next/image';
import styles from './loading.module.css';

export default function LoadingSpinner({
  size = 24,
  delayed = true,
}: {
  size?: number;
  delayed?: boolean;
}) {
  return (
    <Image
      src="/loading.svg"
      alt=""
      width={size}
      height={size}
      unoptimized
      className={`${styles.spinner}${delayed ? ` ${styles.delayed}` : ''}`}
      aria-hidden="true"
    />
  );
}
