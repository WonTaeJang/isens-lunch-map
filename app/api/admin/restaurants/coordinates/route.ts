import { getDb } from '@/lib/server/db';
import { adminErrorResponse } from '@/lib/server/admin-writes';
import { applyCoordinates, previewCoordinates } from '@/lib/server/coordinates';
import { authorize } from '@/lib/server/import/sync';
import { expireRestaurantCache, getRestaurants } from '@/lib/server/restaurants';

export const runtime = 'nodejs';
// Looking up every address can take a while, like an Excel import.
export const maxDuration = 300;

/** Coordinates found again from each stored address, for review; nothing is saved. */
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    authorize(request);
    return Response.json(await previewCoordinates(await getRestaurants(getDb())), { headers });
  } catch (error) {
    return adminErrorResponse(error, '좌표를 재측정하지 못했습니다. 잠시 후 다시 시도해 주세요.', {
      headers,
    });
  }
}

/** Saves the coordinates shown by GET (and their distances), if nothing changed in between. */
export async function POST(request: Request) {
  try {
    authorize(request);
    const result = await applyCoordinates(await request.json().catch(() => null));
    expireRestaurantCache();
    return Response.json(result);
  } catch (error) {
    return adminErrorResponse(
      error,
      '좌표를 반영하지 못했습니다. DB는 변경되지 않았습니다. 잠시 후 다시 시도해 주세요.',
    );
  }
}
