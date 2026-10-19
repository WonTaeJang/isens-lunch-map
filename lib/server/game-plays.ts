import 'server-only';
import type { Pool } from 'pg';
import type { Game } from '@/lib/game-plays/model';
import { KOREAN_TODAY_SQL } from './db';

/**
 * Adds `plays` of `game` to today's count (Korean date). One row per date and game; concurrent
 * saves are safe because the upsert adds inside a single statement.
 */
export async function recordGamePlays(db: Pick<Pool, 'query'>, game: Game, plays: number) {
  await db.query(
    `insert into public.game_play_daily (play_date, game, plays)
     values (${KOREAN_TODAY_SQL}, $1, $2)
     on conflict (play_date, game) do update set plays = public.game_play_daily.plays + excluded.plays`,
    [game, plays],
  );
}
