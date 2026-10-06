import { hasCoordinates } from './coordinates';
import { OFFICE_POSITION } from './office';

const EARTH_RADIUS_METERS = 6371008.8;
const DISTANCE_STEP_METERS = 10;

/**
 * Straight-line (great-circle) distance from the office in meters, rounded to 10 m.
 * Restaurants store this instead of the workbook value; null without valid coordinates.
 */
export function officeDistance(row: {
  latitude: string | null;
  longitude: string | null;
}): number | null {
  if (!hasCoordinates(row)) return null;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const fromLat = radians(OFFICE_POSITION.latitude);
  const toLat = radians(Number(row.latitude));
  const halfLat = (toLat - fromLat) / 2;
  const halfLng = radians(Number(row.longitude) - OFFICE_POSITION.longitude) / 2;
  const h = Math.sin(halfLat) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(halfLng) ** 2;
  const meters = 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
  return Math.round(meters / DISTANCE_STEP_METERS) * DISTANCE_STEP_METERS;
}

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
