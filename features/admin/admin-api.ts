import type { AdminStatistics } from '@/lib/admin/statistics-types';
import type {
  DistancePreview,
  ImportPreview,
  ImportSummary,
  RestaurantRow,
} from '@/lib/restaurant-types';

export type RestaurantUpdate =
  | { action?: 'active'; id: string; active: boolean; previous: boolean }
  | { action: 'address'; id: string; address: string; previousAddress: string | null };

type CommitResult = { summary: ImportSummary & { addressErrors: number } };

const RESTAURANTS_URL = '/api/admin/restaurants';
const DISTANCES_URL = '/api/admin/restaurants/distances';

async function request<T>(
  password: string,
  method: 'POST' | 'PATCH',
  body: FormData | RestaurantUpdate | { revision: string },
  url = RESTAURANTS_URL,
): Promise<T> {
  const headers: Record<string, string> = { 'x-admin-password': password };
  const isForm = body instanceof FormData;
  if (!isForm) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {
    method,
    headers,
    body: isForm ? body : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.error === 'string' ? result.error : '요청에 실패했습니다. 다시 시도해 주세요.',
    );
  return result as T;
}

export function updateRestaurant(password: string, body: RestaurantUpdate) {
  return request<{ ok: boolean }>(password, 'PATCH', body);
}
export function previewImport(password: string, form: FormData) {
  return request<ImportPreview>(password, 'POST', form);
}
export function commitImport(password: string, form: FormData) {
  return request<CommitResult>(password, 'POST', form);
}

async function load<T>(password: string, url: string, failure: string, signal?: AbortSignal) {
  const response = await fetch(url, {
    headers: { 'x-admin-password': password },
    cache: 'no-store',
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || failure);
  return result as T;
}

/** Recomputes every distance from the office for review; nothing is saved. */
export function previewDistances(password: string) {
  return load<DistancePreview>(password, DISTANCES_URL, '거리를 재측정하지 못했습니다.');
}
export function applyDistances(password: string, revision: string) {
  return request<{ updated: number }>(password, 'POST', { revision }, DISTANCES_URL);
}

export async function loadAdminRestaurants(password: string) {
  const result = await load<{ restaurants: RestaurantRow[] }>(
    password,
    RESTAURANTS_URL,
    '관리자 목록을 불러오지 못했습니다.',
  );
  return result.restaurants;
}

export function loadAdminStatistics(password: string, signal?: AbortSignal) {
  return load<AdminStatistics>(
    password,
    '/api/admin/statistics',
    '통계를 불러오지 못했습니다.',
    signal,
  );
}
