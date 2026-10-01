import { authorize } from '@/lib/server/import/sync';
import { getDb } from '@/lib/server/db';
import { getAdminStatistics } from '@/lib/server/admin-statistics';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    authorize(request);
  } catch {
    return Response.json({ error: '관리자 인증이 필요합니다.' }, { status: 401, headers });
  }
  try {
    return Response.json(await getAdminStatistics(getDb()), { headers });
  } catch {
    return Response.json({ error: '통계를 불러오지 못했습니다.' }, { status: 500, headers });
  }
}
