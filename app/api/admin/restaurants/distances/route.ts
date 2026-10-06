import { getDb } from '@/lib/server/db';
import { applyDistances, previewDistances } from '@/lib/server/distances';
import { ImportError } from '@/lib/server/import/parser';
import { authorize } from '@/lib/server/import/sync';
import { expireRestaurantCache, getRestaurants } from '@/lib/server/restaurants';

export const runtime = 'nodejs';

/** Recomputed distances for review; nothing is saved. */
export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    authorize(request);
    return Response.json(previewDistances(await getRestaurants(getDb())), { headers });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ImportError
            ? error.message
            : '거리를 재측정하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      },
      { status: 400, headers },
    );
  }
}

/** Saves the distances shown by GET, if no restaurant changed in between. */
export async function POST(request: Request) {
  try {
    authorize(request);
    const body = await request.json().catch(() => null);
    const result = await applyDistances(body?.revision);
    expireRestaurantCache();
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ImportError
            ? error.message
            : '거리를 반영하지 못했습니다. DB는 변경되지 않았습니다. 잠시 후 다시 시도해 주세요.',
      },
      { status: 400 },
    );
  }
}
