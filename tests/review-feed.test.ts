import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReviewFeed } from '../features/reviews/review-feed';
import { ApiError, reviewRequest } from '../features/reviews/review-api';

type Page = { reviews: { id: string }[]; hasMore: boolean; nextCursor: string | null };
function pendingRequests() {
  const pending: { url: string; init?: RequestInit; resolve: (result: unknown) => void; reject: (error: Error) => void }[] = [];
  const request = <T>(url: string, init?: RequestInit): Promise<T> => new Promise((resolve, reject) => pending.push({ url, init, resolve: value => resolve(value as T), reject }));
  return { request, pending };
}
const page = (id: string, nextCursor: string | null = null): Page => ({ reviews: [{ id }], hasMore: nextCursor !== null, nextCursor });
const flush = () => new Promise(resolve => setImmediate(resolve));

test('late reads cannot overwrite a successful write and refreshed page', async () => {
  const { request, pending } = pendingRequests();
  const feed = createReviewFeed<Page>('/api/reviews?scope=mine', request);
  feed.start(); pending[0].resolve(page('old', 'cursor')); await flush();
  const more = feed.load(true);
  const save = feed.mutate('PATCH', { content: 'new' });
  assert.equal(pending[1].init?.signal?.aborted, true);
  // A server/mock may still complete an aborted request: generation must reject it.
  pending[2].resolve({ ok: true }); await flush();
  pending[3].resolve(page('saved')); await save;
  pending[1].resolve(page('stale')); await more;
  assert.deepEqual(feed.getSnapshot().page, page('saved'));
  assert.equal(feed.getSnapshot().busy, false);
  feed.dispose();
});
test('only latest refresh publishes and disposal suppresses pending reads', async () => {
  const { request, pending } = pendingRequests();
  const feed = createReviewFeed<Page>('/api/reviews?scope=mine', request);
  feed.start();
  const refresh = feed.load();
  pending[1].resolve(page('latest')); await refresh;
  pending[0].resolve(page('old')); await flush();
  assert.deepEqual(feed.getSnapshot().page, page('latest'));
  const last = feed.load(); feed.dispose();
  pending[2].resolve(page('disposed')); await last;
  assert.deepEqual(feed.getSnapshot().page, page('latest'));
});
test('paging uses server cursor and blocks duplicate reads and writes', async () => {
  const { request, pending } = pendingRequests();
  const feed = createReviewFeed<Page>('/api/reviews?scope=mine', request);
  feed.start(); pending[0].resolve(page('first', 'precise+/cursor')); await flush();
  const more = feed.load(true); await feed.load(true);
  assert.equal(pending.length, 2);
  assert.match(pending[1].url, /cursor=precise%2B%2Fcursor/);
  pending[1].resolve(page('second')); await more;
  assert.deepEqual(feed.getSnapshot().page?.reviews, [{ id: 'first' }, { id: 'second' }]);
  const save = feed.mutate('PATCH', {});
  assert.equal(await feed.mutate('PATCH', {}), false);
  pending[2].reject(new ApiError('conflict', 409));
  await assert.rejects(save, error => error instanceof ApiError && error.status === 409);
  assert.equal(feed.getSnapshot().busy, false);
  feed.dispose();
});
test('failed reload after successful save is reported without treating save as failed', async () => {
  const { request, pending } = pendingRequests();
  const feed = createReviewFeed<Page>('/api/reviews?scope=mine', request);
  feed.start(); pending[0].resolve(page('first')); await flush();
  const save = feed.mutate('PATCH', {}); pending[1].resolve({ ok: true }); await flush();
  pending[2].reject(new Error('refresh failed'));
  assert.equal(await save, true);
  assert.equal(feed.getSnapshot().error, 'refresh failed');
  feed.dispose();
});
test('HTTP conflicts preserve status even when server returns a non-JSON body', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ error: 'changed' }, { status: 409 });
    await assert.rejects(reviewRequest('/reviews'), error => error instanceof ApiError && error.status === 409 && error.message === 'changed');
    globalThis.fetch = async () => new Response('upstream failed', { status: 502 });
    await assert.rejects(reviewRequest('/reviews'), error => error instanceof ApiError && error.status === 502);
  } finally { globalThis.fetch = previous; }
});

test('successful creation is counted once before reload even when reload fails', async () => {
  const { request, pending } = pendingRequests();
  const feed = createReviewFeed<Page>('/api/reviews', request);
  feed.start(); pending[0].resolve(page('first')); await flush();
  let count = 0;
  const save = feed.mutate('POST', {}, () => { count++; });
  assert.equal(count, 0);
  pending[1].resolve({ ok: true }); await flush();
  assert.equal(count, 1);
  pending[2].reject(new Error('reload failed'));
  assert.equal(await save, true);
  assert.equal(count, 1);
  feed.dispose();
});
test('failed creation does not count, but a successful in-flight creation counts after disposal', async () => {
  const { request, pending } = pendingRequests();
  const feed = createReviewFeed<Page>('/api/reviews', request);
  feed.start(); pending[0].resolve(page('first')); await flush();
  let count = 0;
  const failed = feed.mutate('POST', {}, () => { count++; });
  pending[1].reject(new Error('save failed'));
  await assert.rejects(failed, /save failed/);
  assert.equal(count, 0);
  const success = feed.mutate('POST', {}, () => { count++; });
  feed.dispose(); pending[2].resolve({ ok: true });
  await success;
  assert.equal(count, 1);
});
