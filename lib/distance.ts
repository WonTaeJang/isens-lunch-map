export function formatDistance(value: string | null) {
  if (value === null || value.trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0)
    return '거리 정보 없음';
  const meters = Number(value);
  return meters >= 1000
    ? `${Number((meters / 1000).toFixed(2))}km`
    : `${meters.toLocaleString('ko-KR')}m`;
}
