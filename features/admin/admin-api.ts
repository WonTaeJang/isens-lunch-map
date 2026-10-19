import type { AdminStatistics } from '@/lib/admin/statistics-types';
import type { RestaurantRow } from '@/lib/restaurant-types';
import type {
  CoordinatePreview,
  DistancePreview,
  ImportPreview,
  ImportSummary,
} from '@/lib/admin/preview-types';
import { jsonBody, requestJson } from '@/lib/request-json';

export type RestaurantUpdate =
  | { action?: 'active'; id: string; active: boolean; previous: boolean }
  | { action: 'address'; id: string; address: string; previousAddress: string | null };

type CommitResult = { summary: ImportSummary & { addressErrors: number } };

const RESTAURANTS_URL = '/api/admin/restaurants';
const DISTANCES_URL = '/api/admin/restaurants/distances';
const COORDINATES_URL = '/api/admin/restaurants/coordinates';
const SAVE_FAILED = '요청에 실패했습니다. 다시 시도해 주세요.';

/**
 * An admin API call with the password header. Uses the shared JSON request, so a response that is
 * not JSON (e.g. a gateway timeout page during a long lookup) shows `failure` instead of a parse error.
 */
function adminRequest<T>(password: string, url: string, failure: string, init: RequestInit = {}) {
  return requestJson<T>(
    url,
    { ...init, headers: { ...init.headers, 'x-admin-password': password } },
    failure,
  );
}

/** Sends a form (multipart, with its own boundary) or a JSON body. */
function send<T>(
  password: string,
  method: 'POST' | 'PATCH',
  body: FormData | object,
  url = RESTAURANTS_URL,
) {
  const init: RequestInit = body instanceof FormData ? { method, body } : jsonBody(method, body);
  return adminRequest<T>(password, url, SAVE_FAILED, init);
}

export function updateRestaurant(password: string, body: RestaurantUpdate) {
  return send<{ ok: boolean }>(password, 'PATCH', body);
}
export function previewImport(password: string, form: FormData) {
  return send<ImportPreview>(password, 'POST', form);
}
export function commitImport(password: string, form: FormData) {
  return send<CommitResult>(password, 'POST', form);
}

function load<T>(password: string, url: string, failure: string, signal?: AbortSignal) {
  return adminRequest<T>(password, url, failure, { signal });
}

/** Recomputes every distance from the office for review; nothing is saved. */
export function previewDistances(password: string) {
  return load<DistancePreview>(password, DISTANCES_URL, '거리를 재측정하지 못했습니다.');
}
export function applyDistances(password: string, revision: string) {
  return send<{ updated: number }>(password, 'POST', { revision }, DISTANCES_URL);
}

/** Looks up every stored address again for review; nothing is saved. */
export function previewCoordinates(password: string) {
  return load<CoordinatePreview>(password, COORDINATES_URL, '좌표를 재측정하지 못했습니다.');
}
/** Saves exactly the previewed coordinates (and their distances). */
export function applyCoordinates(password: string, preview: CoordinatePreview) {
  return send<{ updated: number }>(
    password,
    'POST',
    {
      revision: preview.revision,
      token: preview.token,
      changes: preview.rows.map((row) => ({ id: row.id, ...row.after })),
    },
    COORDINATES_URL,
  );
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
