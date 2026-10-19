import { getDb } from '@/lib/server/db';
import { recordGamePlays } from '@/lib/server/game-plays';
import { gameName, playCount } from '@/lib/game-plays/model';
import { errorResponse, PRIVATE_NO_STORE, readJsonObject } from '@/lib/server/api-route';

export const runtime = 'nodejs';

/** POST { game: 'slot' | 'lunch_box', plays: 1…100 } → 204: adds the plays to today's count. */
export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 200);
    await recordGamePlays(getDb(), gameName(body.game), playCount(body.plays));
    return new Response(null, { status: 204, headers: PRIVATE_NO_STORE });
  } catch (error) {
    return errorResponse(error, 'Game play request failed', '게임 횟수를 저장하지 못했어요.', {
      headers: PRIVATE_NO_STORE,
    });
  }
}
