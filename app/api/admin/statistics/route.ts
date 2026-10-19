import { authorize } from '@/lib/server/import/sync';
import { getDb } from '@/lib/server/db';
import { getAdminStatistics } from '@/lib/server/admin-statistics';
import { adminErrorResponse } from '@/lib/server/admin-writes';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    authorize(request);
    return Response.json(await getAdminStatistics(getDb()), { headers });
  } catch (error) {
    return adminErrorResponse(error, '통계를 불러오지 못했습니다.', { headers });
  }
}
