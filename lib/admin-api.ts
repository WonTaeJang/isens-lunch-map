import type { ImportPreview, ImportSummary } from './restaurant-types';

async function request<T>(password: string, method: 'POST' | 'PATCH', body: FormData | object): Promise<T> {
  const headers: Record<string, string> = {'x-admin-password': password};
  const isForm = body instanceof FormData;
  if (!isForm) headers['Content-Type'] = 'application/json';
  const response = await fetch('/api/admin/restaurants', {method, headers, body: isForm ? body : JSON.stringify(body)});
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '요청에 실패했습니다. 다시 시도해 주세요.');
  return result as T;
}
export function updateRestaurant(password: string, body: object) { return request<{ok: boolean}>(password, 'PATCH', body); }
export function previewImport(password: string, form: FormData) { return request<ImportPreview>(password, 'POST', form); }
export function commitImport(password: string, form: FormData) { return request<{summary: ImportSummary & {addressErrors: number}}>(password, 'POST', form); }
