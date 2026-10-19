import styles from './admin-statistics.module.css';

type Day = {
  date: string;
  /** Read by screen readers for the whole day. */
  label: string;
  /** Shown above the bars. */
  summary: string;
  /** One or more bars side by side, all scaled to the largest value in the chart. */
  bars: { value: number; className?: string }[];
};

/** Bars per day for the last days in the admin statistics (reviews, game plays). */
export default function DayBarChart({
  label,
  days,
  summaryClassName,
  trackClassName,
}: {
  label: string;
  days: Day[];
  summaryClassName?: string;
  trackClassName?: string;
}) {
  const max = Math.max(1, ...days.flatMap((day) => day.bars.map((bar) => bar.value)));
  return (
    <ol className={styles.days} aria-label={label}>
      {days.map((day) => (
        <li key={day.date} aria-label={day.label}>
          <strong className={summaryClassName} aria-hidden="true">
            {day.summary}
          </strong>
          <div
            className={trackClassName ? `${styles.dayTrack} ${trackClassName}` : styles.dayTrack}
            aria-hidden="true"
          >
            {day.bars.map((bar, index) => (
              <span
                key={index}
                className={bar.className}
                style={{ height: `${(bar.value / max) * 100}%` }}
              />
            ))}
          </div>
          <time dateTime={day.date} aria-hidden="true">
            {day.date.slice(5).replace('-', '/')}
          </time>
        </li>
      ))}
    </ol>
  );
}
