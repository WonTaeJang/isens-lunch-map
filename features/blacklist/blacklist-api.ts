import type { BlacklistedRestaurant } from '@/lib/blacklist/model';
import { requestJson } from '@/lib/request-json';

const request = <T>(url: string, init?: RequestInit) =>
  requestJson<T>(url, init, '숨긴 식당 요청을 처리하지 못했어요.');

export const blacklistApi = {
  list: (userId: string) =>
    request<{ restaurants: BlacklistedRestaurant[] }>(
      `/api/blacklist?${new URLSearchParams({ user_id: userId })}`,
    ).then((result) => result.restaurants),
  /** Hides (`hidden`) or shows again a restaurant for `userId`. */
  set: (userId: string, restaurantId: string, hidden: boolean) =>
    request<unknown>('/api/blacklist', {
      method: hidden ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, restaurant_id: restaurantId }),
    }),
};
export type BlacklistApi = typeof blacklistApi;
