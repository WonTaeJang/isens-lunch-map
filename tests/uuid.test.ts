import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUuid } from '../lib/uuid';

test('isUuid accepts 8-4-4-4-12 hex in either case and nothing else', () => {
  assert.equal(isUuid('11111111-1111-4111-8111-111111111111'), true);
  assert.equal(isUuid('ABCDEF01-2345-6789-ABCD-EF0123456789'), true);
  for (const bad of [
    undefined,
    null,
    42,
    '',
    '11111111111141118111111111111111',
    '11111111-1111-4111-8111-11111111111',
    '11111111-1111-4111-8111-1111111111111',
    '------------------------------------',
    'g1111111-1111-4111-8111-111111111111',
    ' 11111111-1111-4111-8111-111111111111',
  ])
    assert.equal(isUuid(bad), false, String(bad));
});
