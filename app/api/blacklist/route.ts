import { getDb } from '@/lib/server/db';
import { addToBlacklist, listBlacklist, removeFromBlacklist } from '@/lib/server/blacklist';
import { BlacklistError, blacklistUuid } from '@/lib/blacklist/model';
import { logUnexpectedError, readJsonObject } from '@/lib/server/api-route';

export const runtime = 'nodejs';
const PRIVATE = { 'Cache-Control': 'private, no-store' };

function failure(error: unknown) {
  if (!(error instanceof BlacklistError)) logUnexpectedError('Blacklist request failed', error);
  return Response.json(
    {
      error:
        error instanceof BlacklistError
          ? error.message
          : '숨긴 식당 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    },
    { status: error instanceof BlacklistError ? error.status : 500, headers: PRIVATE },
  );
}
/** `{ user_id, restaurant_id }`, validated before any database access. */
async function readTarget(request: Request) {
  const body = await readJsonObject(
    request,
    1000,
    (message, status) => new BlacklistError(message, status),
  );
  return { user: blacklistUuid(body.user_id), restaurant: blacklistUuid(body.restaurant_id) };
}

/** GET ?user_id=… → `{ restaurants }`, the user's hidden restaurants (newest first). */
export async function GET(request: Request) {
  try {
    const user = blacklistUuid(new URL(request.url).searchParams.get('user_id'));
    return Response.json({ restaurants: await listBlacklist(getDb(), user) }, { headers: PRIVATE });
  } catch (error) {
    return failure(error);
  }
}

/** POST { user_id, restaurant_id } → `{ restaurant }`, hidden (again is harmless). */
export async function POST(request: Request) {
  try {
    const { user, restaurant } = await readTarget(request);
    return Response.json(
      { restaurant: await addToBlacklist(getDb(), user, restaurant) },
      { headers: PRIVATE },
    );
  } catch (error) {
    return failure(error);
  }
}

/** DELETE { user_id, restaurant_id } → `{ removed }`, shown again (repeating is harmless). */
export async function DELETE(request: Request) {
  try {
    const { user, restaurant } = await readTarget(request);
    return Response.json(
      { removed: await removeFromBlacklist(getDb(), user, restaurant) },
      { headers: PRIVATE },
    );
  } catch (error) {
    return failure(error);
  }
}
