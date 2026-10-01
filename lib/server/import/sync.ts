import 'server-only';
import { geocode, validCoordinates, AddressNotFoundError, GeocodingUnavailableError } from './geocoder';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getDb } from '@/lib/server/db';
import { identity, ImportError, type ImportRow } from './parser';
import type { Restaurant } from '@/lib/server/restaurants';

export function authorize(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new ImportError('서버에 ADMIN_PASSWORD를 설정해 주세요.');
  const given = request.headers.get('x-admin-password') ?? '';
  const hash = (s: string) => createHash('sha256').update(s).digest();
  if (!timingSafeEqual(hash(expected), hash(given))) throw new ImportError('관리자 비밀번호가 올바르지 않습니다.');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new ImportError('허용되지 않은 요청입니다.');
}
export function revision(rows: Restaurant[]) {
  return createHash('sha256').update(JSON.stringify([...rows].sort((a,b) => a.id.localeCompare(b.id)))).digest('hex');
}
export function previewToken(file: Buffer, rev: string) {
  return createHmac('sha256', process.env.ADMIN_PASSWORD!).update(file).update(rev).digest('hex');
}
function matchRows(incoming: ImportRow[], existing: Restaurant[]) {
  const lookup = new Map<string, Restaurant>();
  for (const row of existing) {
    const key = identity(row);
    if (lookup.has(key)) throw new ImportError('DB에 이름과 주소가 같은 중복 식당이 있습니다. 중복을 정리한 뒤 다시 시도해 주세요.');
    lookup.set(key, row);
  }
  const nameKey = (name: string) => name.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  return new Map(incoming.map(row => {
    const exact = lookup.get(identity(row));
    if (exact) return [identity(row), exact];
    const missingAddress = existing.filter(old => old.address === null && nameKey(old.name) === nameKey(row.name));
    if (missingAddress.length && (missingAddress.length !== 1 || incoming.filter(other => nameKey(other.name) === nameKey(row.name)).length !== 1)) {
      throw new ImportError(`${row.name}: 주소가 없는 동명 식당이 있어 비교할 수 없습니다. 관리자에서 주소를 먼저 입력해 주세요.`);
    }
    return [identity(row), missingAddress[0]];
  }));
}
export function plan(incoming: ImportRow[], existing: Restaurant[]) {
  const matches = matchRows(incoming, existing);
  const matchedIds = new Set([...matches.values()].filter(r => !!r).map(r => r.id));
  return { added: incoming.filter(r => !matches.get(identity(r))).length, updated: incoming.filter(r => matches.get(identity(r))).length,
    inactive: incoming.filter(r => !r.active).length, missing: existing.filter(r => !matchedIds.has(r.id) && r.active !== false).length };
}
export async function synchronize(incoming: ImportRow[], existing: Restaurant[], expected: string) {
  const summary = { ...plan(incoming, existing), addressErrors: 0 };
  const lookup = matchRows(incoming, existing);
  const addresses = new Map<string, { latitude: string | null; longitude: string | null }>();
  existing.filter(validCoordinates).forEach(r => { if (r.address !== null) addresses.set(r.address, r); });
  const prepared = [];
  const deadline = Date.now() + 200000;
  // Resolve every coordinate before any DB changes. Failed lookups become address-error rows; database writes remain atomic.
  for (const row of incoming) {

    const old = lookup.get(identity(row));
    let coordinates = old?.address !== null && validCoordinates(old) ? old! : addresses.get(row.address);
    let addressFailed = false;
    if (!validCoordinates(coordinates)) {
      try {
        if (Date.now() > deadline) throw new GeocodingUnavailableError('주소 검색 시간이 초과되었습니다. DB는 변경하지 않았습니다. 다시 시도해 주세요.');
        coordinates = await geocode(row.address);
      } catch (error) {
        if (!(error instanceof AddressNotFoundError)) throw error;
        addressFailed = true;
        coordinates = { latitude: null, longitude: null };
        summary.addressErrors++;
      }
    }
    if (validCoordinates(coordinates)) addresses.set(row.address, coordinates!);
    prepared.push({ ...row, address: addressFailed ? null : (old?.address && validCoordinates(old) ? old.address : row.address), id: old?.id, latitude: coordinates!.latitude, longitude: coordinates!.longitude });
  }
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE public.restaurants IN EXCLUSIVE MODE');
    const current = await client.query<Restaurant>('select id, name, category, main_menu, address, distance, active, latitude, longitude, created_at, updated_at from public.restaurants order by name, id');
    if (revision(current.rows) !== expected) throw new ImportError('미리보기 이후 DB가 변경되었습니다. 다시 미리보기를 실행해 주세요.');
    const ids: string[] = [];
    for (const row of prepared) {
      const values = [row.name, row.category, row.main_menu, row.address, row.distance, row.active, row.latitude, row.longitude];
      const result = row.id
        ? await client.query('update public.restaurants set name=$1, category=$2, main_menu=$3, address=$4, distance=$5, active=$6, latitude=$7, longitude=$8, updated_at=now() where id=$9 returning id', [...values, row.id])
        : await client.query('insert into public.restaurants (id,name,category,main_menu,address,distance,active,latitude,longitude,created_at,updated_at) values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,now(),now()) returning id', values);
      ids.push(result.rows[0].id);
    }
    await client.query('update public.restaurants set active=false, updated_at=now() where not (id=any($1::uuid[])) and active is distinct from false', [ids]);
    await client.query('COMMIT');
    return summary;
  } catch (error) {
    await client.query('ROLLBACK'); throw error;
  } finally { client.release(); }
}

export async function correctAddress(id: unknown, address: unknown, previousAddress: unknown) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || typeof address !== 'string' || !address.trim() || address.length > 500 || (previousAddress !== null && typeof previousAddress !== 'string')) {
    throw new ImportError('식당과 수정할 주소를 확인해 주세요.');
  }
  const coordinates = await geocode(address.trim());
  const result = await getDb().query(
    `update public.restaurants set address=$1,
     latitude=$2, longitude=$3, updated_at=now()
     where id=$4 and address is not distinct from $5 returning id`,
    [address.trim(), coordinates.latitude, coordinates.longitude, id, previousAddress],
  );
  if (!result.rowCount) throw new ImportError('식당이 삭제되었거나 주소가 변경되었습니다. 새로고침 후 다시 시도해 주세요.');
}
