// 블랙리스트(숨긴 식당): 서버 검증과 화면에서 함께 쓰는 타입과 입력 검증
import { isUuid } from '@/lib/uuid';

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

export class BlacklistError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function blacklistUuid(value: unknown): string {
  if (!isUuid(value)) throw new BlacklistError('식별 정보가 올바르지 않아요.');
  return value.toLowerCase();
}
