import { getDb } from '@/lib/server/db';
import {
  cancelTodayVisit,
  getTodayVisit,
  listMonthVisits,
  setTodayVisit,
} from '@/lib/server/lunch-visits';
import { visitMonth, visitUserName, visitUuid } from '@/lib/lunch-visits/model';
import { errorResponse, PRIVATE_NO_STORE, readJsonObject } from '@/lib/server/api-route';

export const runtime = 'nodejs';
const headers = PRIVATE_NO_STORE;
const readBody = (request: Request) => readJsonObject(request, 4000);

const failure = (error: unknown) =>
  errorResponse(
    error,
    'Lunch visit request failed',
    '오늘의 점심 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    { headers },
  );
/**
 * GET ?user_id=… → today's visit
 * GET ?user_id=…&scope=month&month=YYYY-MM → that month's visits
 */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const user = visitUuid(params.get('user_id'));
    if (params.get('scope') === 'month') {
      const visits = await listMonthVisits(getDb(), user, visitMonth(params.get('month')));
      return Response.json({ visits }, { headers });
    }
    return Response.json({ visit: await getTodayVisit(getDb(), user) }, { headers });
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
    return Response.json({ visit }, { headers });
  } catch (error) {
    return failure(error);
  }
}

/** DELETE { user_id } → cancels today's lunch. Repeating it is harmless. */
export async function DELETE(request: Request) {
  try {
    const body = await readBody(request);
    const deleted = await cancelTodayVisit(getDb(), visitUuid(body.user_id));
    return Response.json({ deleted }, { headers });
  } catch (error) {
    return failure(error);
  }
}
