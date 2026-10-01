import nextEnv from '@next/env';
import ExcelJS from 'exceljs';
nextEnv.loadEnvConfig(process.cwd(), true);
try {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD missing');
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('검증');
  sheet.addRow(['카테고리', '가맹점명', '대표메뉴', '주소', '거리']);
  sheet.addRow(['한식', '연결 검증용 항목', '메뉴', '서울 서초구 반포대로28길 43', '0.1Km']);
  sheet.getCell('B2').font = { strike: true };
  const form = new FormData();
  form.set('mode', 'preview');
  form.set('file', new Blob([await book.xlsx.writeBuffer()]), 'validation.xlsx');
  const response = await fetch('http://localhost:3000/api/admin/restaurants', {
    method: 'POST',
    headers: { 'x-admin-password': password },
    body: form,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  console.log('Read-only import preview:', {
    status: response.status,
    rows: result.rows.length,
    strikeRecognized: result.rows[0].active === false,
    summary: result.summary,
  });
  const denied = await fetch('http://localhost:3000/api/admin/restaurants', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  console.log('Unauthenticated mutation rejected:', !denied.ok);
  if (!process.env.KAKAO_REST_API_KEY) throw new Error('KAKAO_REST_API_KEY missing');
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  url.searchParams.set('query', '서울 서초구 반포대로28길 43');
  url.searchParams.set('analyze_type', 'exact');
  const geo = await fetch(url, {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
  });
  const data = await geo.json();
  console.log('Kakao address lookup:', {
    status: geo.status,
    matches: data.documents?.length ?? 0,
  });
  if (!geo.ok || data.documents?.length !== 1) process.exitCode = 1;
} catch {
  console.error(
    'Integration check failed; inspect app configuration. No test records were written.',
  );
  process.exitCode = 1;
}
