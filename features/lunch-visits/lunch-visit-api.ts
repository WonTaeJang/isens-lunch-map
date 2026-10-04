import type { LunchVisit } from '@/lib/lunch-visits/model';
import { requestJson } from '@/lib/request-json';

function request<T>(init?: RequestInit, query = ''): Promise<T> {
  return requestJson<T>(`/api/lunch-visits${query}`, init, '오늘의 점심을 저장하지 못했습니다.');
}
const json = (method: string, body: object): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const lunchVisitApi = {
  today: (userId: string, signal?: AbortSignal) =>
    request<{ visit: LunchVisit | null }>(
      { signal },
      `?${new URLSearchParams({ user_id: userId })}`,
    ),
  choose: (body: { user_id: string; user_name: string; restaurant_id: string }) =>
    request<{ visit: LunchVisit }>(json('PUT', body)),
  cancel: (userId: string) => request<{ deleted: boolean }>(json('DELETE', { user_id: userId })),
};
