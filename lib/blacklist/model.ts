// 블랙리스트(숨긴 식당): 서버 검증과 화면에서 함께 쓰는 타입과 입력 검증
import { RequestError, requireUuid } from '@/lib/request-error';

/** A restaurant the user hid from the map, the lunch list and the random pick. */
export type BlacklistedRestaurant = {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_category: string | null;
  /** False once the restaurant is deactivated (it stays listed until the user removes it). */
  restaurant_active: boolean | null;
  created_at: string;
};

/** The hidden restaurant ids a server page looked up for the viewer (from the user cookie). */
export type BlacklistSeed = { owner: string; ids: string[] };

export class BlacklistError extends RequestError {}

export function blacklistUuid(value: unknown): string {
  return requireUuid(value, BlacklistError);
}
