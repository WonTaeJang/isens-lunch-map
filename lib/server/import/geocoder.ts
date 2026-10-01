import 'server-only';
import { ImportError } from './parser';

export class AddressNotFoundError extends ImportError {}
export class GeocodingUnavailableError extends ImportError {}

export function validCoordinates(r?: { latitude: string | null; longitude: string | null }) {
  return !!r && r.latitude !== null && r.longitude !== null && r.latitude.trim() !== '' && r.longitude.trim() !== '' && Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)) && Math.abs(Number(r.latitude)) <= 90 && Math.abs(Number(r.longitude)) <= 180;
}
export async function geocode(address: string) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new GeocodingUnavailableError('좌표 검색을 위해 KAKAO_REST_API_KEY를 설정해 주세요.');
  const roadAddress = address.match(/^(.+?(?:대로|로|길)\s*\d+(?:-\d+)?)(?=\s|[,(.]|$)/)?.[1];
  const normalizedRoadAddress = roadAddress?.replace(/^서울시\s/, '서울특별시 ').replace(/(대로|로|길)(?=\d+(?:-\d+)?$)/, '$1 ');
  const addressCandidates = [address, roadAddress, normalizedRoadAddress];
  const queries = [...new Set(addressCandidates.filter((value): value is string => !!value))];
  let document: { x: string; y: string } | undefined;
  for (const query of queries) {
    const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
    url.searchParams.set('query', query);
    url.searchParams.set('analyze_type', 'exact');
    let data;
    try {
      const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(10000), cache: 'no-store' });
      if (!response.ok) throw new Error('Geocoding service unavailable');
      data = await response.json();
      if (!Array.isArray(data.documents) || typeof data.meta?.total_count !== 'number') throw new Error('Invalid geocoding response');
    } catch { throw new GeocodingUnavailableError('주소 검색 서비스를 사용할 수 없습니다. DB는 변경하지 않았습니다. 잠시 후 다시 시도해 주세요.'); }
    if (data.documents?.length === 1 && data.meta?.total_count === 1) { document = data.documents[0]; break; }
  }
  if (!document) throw new AddressNotFoundError(`주소를 하나로 확정할 수 없습니다: ${address}. 도로명과 건물번호 위주로 수정해 주세요.`);
  const result = { latitude: String(document.y), longitude: String(document.x) };
  if (!validCoordinates(result)) throw new GeocodingUnavailableError('카카오 검색 결과의 좌표가 올바르지 않습니다.');
  return result;
}
