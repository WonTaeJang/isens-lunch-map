import type { LunchVisit } from '@/lib/lunch-visits/model';
import { jsonBody, requestJson } from '@/lib/request-json';

function request<T>(
  init?: RequestInit,
  query = '',
  fallback = '오늘의 점심을 저장하지 못했어요.',
): Promise<T> {
  return requestJson<T>(`/api/lunch-visits${query}`, init, fallback);
}

export const lunchVisitApi = {
  today: (userId: string, signal?: AbortSignal) =>
    request<{ visit: LunchVisit | null }>(
      { signal },
      `?${new URLSearchParams({ user_id: userId })}`,
    ),
  choose: (body: { user_id: string; user_name: string; restaurant_id: string }) =>
    request<{ visit: LunchVisit }>(jsonBody('PUT', body)),
  month: (userId: string, month: string, signal?: AbortSignal) =>
    request<{ visits: LunchVisit[] }>(
      { signal },
      `?${new URLSearchParams({ user_id: userId, scope: 'month', month })}`,
      '점심 기록을 불러오지 못했어요.',
    ),
  cancel: (userId: string) =>
    request<{ deleted: boolean }>(jsonBody('DELETE', { user_id: userId })),
};
