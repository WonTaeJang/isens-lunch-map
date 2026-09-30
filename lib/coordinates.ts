export function hasCoordinates(row: {latitude: string | null; longitude: string | null}) {
  return !!(row.latitude?.trim() && row.longitude?.trim() && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)) && Math.abs(Number(row.latitude)) <= 90 && Math.abs(Number(row.longitude)) <= 180);
}
