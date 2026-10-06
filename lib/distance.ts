/** A stored distance column as meters; null when empty (NaN when not a number). */
export function parseDistance(value: string | null) {
  return value === null || value.trim() === '' ? null : Number(value);
}

export function formatDistance(value: string | null) {
  const meters = parseDistance(value);
  if (meters === null || !Number.isFinite(meters) || meters < 0) return '거리 정보 없음';
  return meters >= 1000
    ? `${Number((meters / 1000).toFixed(2))}km`
    : `${meters.toLocaleString('ko-KR')}m`;
}
