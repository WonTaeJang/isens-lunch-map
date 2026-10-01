import styles from './progress-bar.module.css';

type Props = { value: number; label?: string; valueText?: string; className?: string };
export default function ProgressBar({ value, label, valueText, className = '' }: Props) {
  const percent = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <div
      className={`${styles.track} ${className}`.trim()}
      role={label ? 'progressbar' : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? percent : undefined}
      aria-valuetext={valueText}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
