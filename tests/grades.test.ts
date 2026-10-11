import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRADE_POINTS,
  TIERS,
  gradeScore,
  isTierId,
  nextTier,
  tierById,
  tierFor,
  tierProgress,
  tierRank,
} from '../lib/grades/model';

test('activity turns into points: content reviews, votes, 오늘의 점심 and likes', () => {
  assert.equal(
    gradeScore({ contentReviews: 2, voteReviews: 3, lunchVisits: 4, likesReceived: 1 }),
    2 * GRADE_POINTS.contentReview + 3 * 2 + 4 * 3 + 5,
  );
  assert.equal(
    gradeScore({ contentReviews: 0, voteReviews: 0, lunchVisits: 0, likesReceived: 0 }),
    0,
  );
});

test('nine tiers in rising order, each reached from its minimum score', () => {
  assert.equal(TIERS.length, 9);
  assert.deepEqual(
    TIERS.map((tier) => tier.min),
    [0, 30, 100, 250, 500, 900, 1500, 2500, 4000],
  );
  assert.equal(tierFor(0).id, 'iron');
  assert.equal(tierFor(29).id, 'iron');
  assert.equal(tierFor(30).id, 'bronze');
  assert.equal(tierFor(899).id, 'platinum');
  assert.equal(tierFor(900).id, 'diamond');
  assert.equal(tierFor(99999).id, 'challenger');
});

test('tier order, ids and the next tier', () => {
  assert.equal(tierRank('iron'), 0);
  assert.equal(tierRank('challenger'), 8);
  assert.equal(tierRank('wood'), -1);
  assert.equal(isTierId('gold'), true);
  assert.equal(isTierId('Gold'), false);
  assert.equal(isTierId(3), false);
  assert.equal(nextTier(TIERS[0])?.id, 'bronze');
  assert.equal(nextTier(TIERS[8]), null);
  assert.equal(tierById('gold').min, 250);
});

test('progress runs from the tier toward the next one and is null at the top', () => {
  const bronze = TIERS[1];
  assert.equal(tierProgress(bronze, 30), 0);
  assert.equal(tierProgress(bronze, 65), 0.5);
  assert.equal(tierProgress(bronze, 100), 1);
  // A stored tier never drops, so the score can sit below it or past the next one.
  assert.equal(tierProgress(bronze, 10), 0);
  assert.equal(tierProgress(bronze, 400), 1);
  assert.equal(tierProgress(TIERS[8], 99999), null);
});
