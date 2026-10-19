// 게임 횟수: 슬롯 게임(오늘 뭐 먹지?)과 오늘의 점심 상자를 날짜(한국 시간)별로 셉니다.
import { RequestError } from '@/lib/request-error';

export const GAMES = ['slot', 'lunch_box'] as const;
export type Game = (typeof GAMES)[number];
export const GAME_LABELS: Record<Game, string> = { slot: '슬롯 게임', lunch_box: '점심 상자' };
/** Plays one save may add: a game popup sends its plays when it closes, at most this many at once. */
export const MAX_PLAYS_PER_SAVE = 100;

export class GamePlayError extends RequestError {}

export function gameName(value: unknown): Game {
  if (!GAMES.includes(value as Game)) throw new GamePlayError('게임 정보가 올바르지 않아요.');
  return value as Game;
}

export function playCount(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > MAX_PLAYS_PER_SAVE)
    throw new GamePlayError('게임 횟수가 올바르지 않아요.');
  return value as number;
}
