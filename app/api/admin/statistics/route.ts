import { getDb } from '@/lib/server/db';
import { getAdminStatistics, getGameStatistics } from '@/lib/server/admin-statistics';
import { adminErrorResponse, authorize } from '@/lib/server/admin';
import { logUnexpectedError, PRIVATE_NO_STORE } from '@/lib/server/api-route';

export const runtime = 'nodejs';
const headers = PRIVATE_NO_STORE;
export async function GET(request: Request) {
  try {
    authorize(request);
    const db = getDb();
    // Game plays are optional: without them (e.g. no game_play_daily table) the rest still shows.
    const [statistics, games] = await Promise.all([
      getAdminStatistics(db),
      getGameStatistics(db).catch((error) => {
        logUnexpectedError('Game statistics failed', error);
        return null;
      }),
    ]);
    return Response.json({ ...statistics, games }, { headers });
  } catch (error) {
    return adminErrorResponse(error, '통계를 불러오지 못했습니다.', { headers });
  }
}
