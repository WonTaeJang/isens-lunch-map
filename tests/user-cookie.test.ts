import { test } from 'node:test';
import assert from 'node:assert/strict';
import { USER_COOKIE, userCookie } from '../lib/user-cookie';

const user = '11111111-1111-4111-8111-111111111111';

test('the user cookie is site-wide, kept for a year and Secure only on https', () => {
  assert.equal(USER_COOKIE, 'lunch_user_id');
  assert.equal(
    userCookie(user, false),
    `lunch_user_id=${user}; Path=/; Max-Age=31536000; SameSite=Lax`,
  );
  assert.match(userCookie(user, true), /; SameSite=Lax; Secure$/);
});
