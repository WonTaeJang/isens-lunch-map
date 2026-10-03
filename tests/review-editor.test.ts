import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createReviewEditor,
  reviewEditorReducer as reduce,
} from '../features/reviews/review-editor';
import type { Review } from '../lib/reviews/model';
const review: Review = {
  id: 'one',
  user_name: 'name',
  content: 'original',
  tags: [],
  is_recommended: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: null,
  is_mine: true,
};
test('conflict recovery preserves the draft and requires explicit version acceptance', () => {
  let state = createReviewEditor(review);
  state = reduce(state, { type: 'content', value: 'my unsaved draft' });
  state = reduce(state, { type: 'tag', value: 'tasty' });
  state = reduce(state, { type: 'conflict' });
  const latest = { ...review, content: 'changed elsewhere', updated_at: '2026-10-02T00:00:00Z' };
  state = reduce(state, { type: 'latest', value: latest });
  assert.equal(state.base, review);
  assert.equal(state.conflict, true);
  state = reduce(state, { type: 'accept-version' });
  assert.equal(state.base, latest);
  assert.equal(state.conflict, false);
  assert.equal(state.content, 'my unsaved draft');
  assert.deepEqual(state.tags, ['tasty']);
});
test('deleted reviews cannot be retried using a stale version', () => {
  let state = reduce(createReviewEditor(review), { type: 'conflict' });
  state = reduce(state, { type: 'latest', value: null });
  state = reduce(state, { type: 'accept-version' });
  assert.equal(state.conflict, true);
  assert.equal(state.content, review.content);
});
