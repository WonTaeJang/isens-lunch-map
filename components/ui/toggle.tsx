'use client';

import styles from './toggle.module.css';

type ToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
};

export default function Toggle({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  onLabel = '켜짐',
  offLabel = '꺼짐',
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={styles.toggle}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span aria-hidden="true">{checked ? onLabel : offLabel}</span>
    </button>
  );
}
