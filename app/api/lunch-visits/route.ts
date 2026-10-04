import { getDb } from '@/lib/server/db';
import {
  cancelTodayVisit,
  getTodayVisit,
  listUserVisits,
  setTodayVisit,
} from '@/lib/server/lunch-visits';
import { LunchVisitError, visitCursor, visitUserName, visitUuid } from '@/lib/lunch-visits/model';
import { logUnexpectedError, readJsonObject } from '@/lib/server/api-route';

export const runtime = 'nodejs';
const PRIVATE = { 'Cache-Control': 'private, no-store' };
const readBody = (request: Request) =>
  readJsonObject(request, 4000, (message, status) => new LunchVisitError(message, status));

function failure(error: unknown) {
  if (!(error instanceof LunchVisitError)) logUnexpectedError('Lunch visit request failed', error);
  return Response.json(
    {
      error:
        error instanceof LunchVisitError
          ? error.message
          : '오늘의 점심 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    },
    { status: error instanceof LunchVisitError ? error.status : 500, headers: PRIVATE },
  );
}
/** GET ?user_id=… → today's visit; GET ?user_id=…&scope=history[&cursor=YYYY-MM-DD] → history. */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const user = visitUuid(params.get('user_id'));
    if (params.get('scope') === 'history') {
      const cursor = visitCursor(params.get('cursor'));
      return Response.json(await listUserVisits(getDb(), user, cursor), { headers: PRIVATE });
    }
    return Response.json({ visit: await getTodayVisit(getDb(), user) }, { headers: PRIVATE });
  } catch (error) {
    return failure(error);
  }
}

/** PUT { user_id, user_name, restaurant_id } → records or replaces today's lunch. */
export async function PUT(request: Request) {
  try {
    const body = await readBody(request);
    const visit = await setTodayVisit(getDb(), {
      user: visitUuid(body.user_id),
      userName: visitUserName(body.user_name),
      restaurant: visitUuid(body.restaurant_id),
    });
    return Response.json({ visit }, { headers: PRIVATE });
  } catch (error) {
    return failure(error);
  }
}

/** DELETE { user_id } → cancels today's lunch. Repeating it is harmless. */
export async function DELETE(request: Request) {
  try {
    const body = await readBody(request);
    const deleted = await cancelTodayVisit(getDb(), visitUuid(body.user_id));
    return Response.json({ deleted }, { headers: PRIVATE });
  } catch (error) {
    return failure(error);
  }
}
