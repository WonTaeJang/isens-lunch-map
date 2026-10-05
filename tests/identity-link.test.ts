import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeIdentity,
  encodeIdentity,
  identityFromHash,
  identityLink,
} from '../features/local-user/identity-link';

const identity = {
  user_id: '11111111-1111-4111-8111-111111111111',
  user_name: '야무진젤리#6003',
};

test('identity codes round-trip Korean names and stay URL-safe', () => {
  const code = encodeIdentity(identity);
  assert.match(code, /^LM1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeIdentity(code), identity);
  const link = identityLink('https://lunch.example', identity);
  assert.equal(link, `https://lunch.example/user#import=${code}`);
  assert.deepEqual(identityFromHash(new URL(link).hash), identity);
});

test('only valid current-version codes are accepted', () => {
  const encode = (data: unknown) =>
    'LM1.' + Buffer.from(JSON.stringify(data)).toString('base64url');
  assert.equal(identityFromHash(''), undefined);
  assert.equal(identityFromHash('#lunch-map-layout'), undefined);
  for (const bad of [
    '',
    'LM1.',
    'LM1.@@@',
    'LM2.' + encodeIdentity(identity).slice(4),
    encode({ i: 'not-a-uuid', n: '이름' }),
    encode({ i: identity.user_id, n: '   ' }),
    encode({ i: identity.user_id, n: '가'.repeat(61) }),
    encode({ i: identity.user_id }),
    encode(['array']),
  ])
    assert.equal(decodeIdentity(bad), null, bad);
  assert.equal(identityFromHash('#import=broken'), null);
  // IDs are normalized like the identity editor does.
  assert.deepEqual(decodeIdentity(encode({ i: identity.user_id.toUpperCase(), n: ' 이름 ' })), {
    user_id: identity.user_id,
    user_name: '이름',
  });
});
