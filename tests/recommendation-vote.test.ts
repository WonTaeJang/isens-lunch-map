import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shownCounts, voteAction, voteInput } from '../features/reviews/recommendation-vote-model';
import type { Review } from '../lib/reviews/model';

const review: Review = {
  id: 'one',
  user_name: 'name',
  content: '',
  tags: ['tasty'],
  is_recommended: true,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: null,
  is_mine: true,
};

test('a press creates, switches or deletes the own review', () => {
  assert.deepEqual(voteAction(null, false), {
    type: 'write',
    method: 'POST',
    review: null,
    next: false,
  });
  assert.deepEqual(voteAction(review, false), {
    type: 'write',
    method: 'PATCH',
    review,
    next: false,
  });
  assert.deepEqual(voteAction(review, true), {
    type: 'write',
    method: 'DELETE',
    review,
    next: null,
  });
});

test('pressing the same choice asks first only when the review has written content', () => {
  const written = { ...review, content: '맛있어요' };
  assert.deepEqual(voteAction(written, true), { type: 'confirm-delete', review: written });
  assert.equal(voteAction({ ...review, content: '   ' }, true).type, 'write');
});

test('a vote sends no content, a switch keeps content and tags, a delete sends nothing', () => {
  assert.deepEqual(voteInput(null, true), { content: '', tags: [], is_recommended: true });
  assert.deepEqual(voteInput({ ...review, content: '좋아요' }, false), {
    content: '좋아요',
    tags: ['tasty'],
    is_recommended: false,
  });
  assert.deepEqual(voteInput(review, null), {});
});

test('shown counts move the saved choice to the pending one', () => {
  const base = { recommended: 5, not_recommended: 2 };
  assert.deepEqual(shownCounts(base, null, true), { recommended: 6, not_recommended: 2 });
  assert.deepEqual(shownCounts(base, true, false), { recommended: 4, not_recommended: 3 });
  assert.deepEqual(shownCounts(base, false, null), { recommended: 5, not_recommended: 1 });
  assert.deepEqual(shownCounts(base, true, true), base);
});
