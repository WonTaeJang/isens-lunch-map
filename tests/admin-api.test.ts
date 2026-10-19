import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewImport, updateRestaurant } from '../features/admin/admin-api';

test('admin API keeps multipart boundary generation with fetch and forwards authentication', async () => {
  const previous = globalThis.fetch;
  const form = new FormData();
  form.set('mode', 'preview');
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/admin/restaurants');
    assert.equal(init?.method, 'POST');
    assert.equal(init?.body, form);
    assert.equal(new Headers(init?.headers).get('Content-Type'), null);
    assert.equal(new Headers(init?.headers).get('x-admin-password'), 'test-password');
    return Response.json({ rows: [] });
  };
  try {
    await previewImport('test-password', form);
  } finally {
    globalThis.fetch = previous;
  }
});
test('admin API serializes state changes and propagates server errors', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.method, 'PATCH');
    assert.equal(new Headers(init?.headers).get('Content-Type'), 'application/json');
    assert.deepEqual(JSON.parse(String(init?.body)), { id: 'test', active: false, previous: true });
    return Response.json({ error: '상태가 변경되었습니다.' }, { status: 400 });
  };
  try {
    await assert.rejects(
      updateRestaurant('test-password', { id: 'test', active: false, previous: true }),
      /상태가 변경되었습니다/,
    );
  } finally {
    globalThis.fetch = previous;
  }
});

test('admin list requires a password header and bypasses the browser cache', async () => {
  const { loadAdminRestaurants } = await import('../features/admin/admin-api');
  const previous = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('x-admin-password'), 'test-password');
    assert.equal(init?.cache, 'no-store');
    return Response.json({ restaurants: [{ id: 'a' }] });
  };
  try {
    assert.deepEqual(await loadAdminRestaurants('test-password'), [{ id: 'a' }]);
  } finally {
    globalThis.fetch = previous;
  }
});

test('admin list rejects unauthenticated requests before accessing the database', async () => {
  const { GET } = await import('../app/api/admin/restaurants/route');
  const original = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = 'test-password';
  try {
    const response = await GET(new Request('http://localhost/api/admin/restaurants'));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal('restaurants' in (await response.json()), false);
  } finally {
    if (original === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = original;
  }
});

test('admin API shows its own message when the server answers with a non-JSON page', async () => {
  const { previewCoordinates } = await import('../features/admin/admin-api');
  const previous = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response('<html>Gateway Timeout</html>', {
      status: 504,
      headers: { 'Content-Type': 'text/html' },
    });
  try {
    await assert.rejects(previewCoordinates('test-password'), /좌표를 재측정하지 못했습니다/);
  } finally {
    globalThis.fetch = previous;
  }
});

test('admin errors keep their own status; unexpected ones are logged as 500 without details', async () => {
  const { adminErrorResponse } = await import('../lib/server/admin-writes');
  const { ImportError } = await import('../lib/server/import/parser');
  const own = adminErrorResponse(new ImportError('비밀번호가 올바르지 않습니다.', 401), '실패');
  assert.equal(own.status, 401);
  assert.deepEqual(await own.json(), { error: '비밀번호가 올바르지 않습니다.' });

  const logged: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => logged.push(args);
  try {
    const failure = Object.assign(new Error('password=secret host=db'), { code: '57P01' });
    const response = adminErrorResponse(failure, '처리에 실패했습니다.', {
      headers: { 'Cache-Control': 'private, no-store' },
    });
    assert.equal(response.status, 500);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.deepEqual(await response.json(), { error: '처리에 실패했습니다.' });
    assert.equal(logged.length, 1);
    assert.doesNotMatch(JSON.stringify(logged), /secret/);
    assert.match(JSON.stringify(logged), /57P01/);
  } finally {
    console.error = original;
  }
});
