import { getDb } from '@/lib/server/db';
import { getAdminStatistics } from '@/lib/server/admin-statistics';
import { adminErrorResponse, authorize } from '@/lib/server/admin';
import { PRIVATE_NO_STORE } from '@/lib/server/api-route';

export const runtime = 'nodejs';
const headers = PRIVATE_NO_STORE;
export async function GET(request: Request) {
  try {
    authorize(request);
    return Response.json(await getAdminStatistics(getDb()), { headers });
  } catch (error) {
    return adminErrorResponse(error, '통계를 불러오지 못했습니다.', { headers });
  }
}
