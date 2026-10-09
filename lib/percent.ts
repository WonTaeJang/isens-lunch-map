const PERCENT_FORMAT = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });

/** `part` of `total` as 0–100, clamped (0 when there is nothing to count). */
export function percent(part: number, total: number) {
  return total > 0 ? Math.min(100, Math.max(0, (part / total) * 100)) : 0;
}

/** A 0–100 value as shown in the app: up to one decimal, e.g. 2.34 → "2.3%", 25 → "25%". */
export function formatPercent(value: number) {
  return `${PERCENT_FORMAT.format(value)}%`;
}
