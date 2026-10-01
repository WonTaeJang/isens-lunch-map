import { getRestaurants } from '@/lib/server/restaurants';
import { getDb } from '@/lib/server/db';
import { ImportError, parseWorkbook } from '@/lib/server/import/parser';
import { authorize, plan, previewToken, revision, synchronize, correctAddress } from '@/lib/server/import/sync';

export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    authorize(request);
    if (Number(request.headers.get('content-length')) > 3.5 * 1024 * 1024) throw new ImportError('파일은 3MB 이하로 업로드해 주세요.');
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx') || file.size > 3 * 1024 * 1024) throw new ImportError('3MB 이하의 .xlsx 파일만 지원합니다. .xls는 .xlsx로 저장해 주세요.');
    const buffer = Buffer.from(await file.arrayBuffer());
    const incoming = await parseWorkbook(buffer);
    const existing = await getRestaurants();
    const rev = revision(existing);
    if (form.get('mode') === 'preview') {
      return Response.json({ rows: incoming, summary: plan(incoming, existing), revision: rev, token: previewToken(buffer, rev) });
    }
    if (form.get('mode') !== 'commit' || form.get('revision') !== rev || form.get('token') !== previewToken(buffer, rev)) throw new ImportError('파일 또는 DB가 변경되었습니다. 다시 미리보기를 실행해 주세요.');
    return Response.json({ summary: await synchronize(incoming, existing, rev) });
  } catch (error) {
    return Response.json({ error: error instanceof ImportError ? error.message : '처리에 실패했습니다. DB는 반영되지 않았습니다. 잠시 후 다시 시도해 주세요.' }, { status: 400 });
  }
}
export async function PATCH(request: Request) {
  try {
    authorize(request);
    const body = await request.json();
    if (body.action === 'address') {
      await correctAddress(body.id, body.address, body.previousAddress);
      return Response.json({ ok: true });
    }
    if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.active !== 'boolean' || typeof body.previous !== 'boolean') throw new ImportError('상태 변경 요청이 올바르지 않습니다.');
    const result = await getDb().query('update public.restaurants set active=$1, updated_at=now() where id=$2 and coalesce(active,false)=$3 returning id', [body.active, body.id, body.previous]);
    if (!result.rowCount) throw new ImportError('다른 작업에서 상태가 변경되었습니다. 새로고침 후 다시 시도해 주세요.');
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof ImportError ? error.message : '변경하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try { authorize(request); }
  catch (error) {
    return Response.json({ error: error instanceof ImportError ? error.message : '인증에 실패했습니다.' }, { status: 401, headers });
  }
  try {
    const restaurants = await getRestaurants();
    return Response.json({ restaurants: restaurants.map(({ id, name, category, main_menu, address, active, distance, latitude, longitude }) => ({ id, name, category, main_menu, address, active, distance, latitude, longitude })) }, { headers });
  } catch { return Response.json({ error: '식당 목록을 불러오지 못했습니다. 다시 시도해 주세요.' }, { status: 500, headers }); }
}
