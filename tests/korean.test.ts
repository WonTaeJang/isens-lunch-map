import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withEuro } from '../lib/korean';

test('으로/로 follows the final consonant, digits as read aloud, ㄹ takes 로', () => {
  assert.equal(withEuro('고공 서초점'), '고공 서초점으로');
  assert.equal(withEuro('평안면옥'), '평안면옥으로');
  assert.equal(withEuro('라멘트럭'), '라멘트럭으로');
  assert.equal(withEuro('남도식당'), '남도식당으로');
  assert.equal(withEuro('한솥도시락'), '한솥도시락으로');
  assert.equal(withEuro('광해쭈꾸미'), '광해쭈꾸미로');
  assert.equal(withEuro('서울'), '서울로');
  assert.equal(withEuro('(주)나의가야 서초점'), '(주)나의가야 서초점으로');
  assert.equal(withEuro('봉구스밥버거(교대점)'), '봉구스밥버거(교대점)으로');
  // Nicknames end with #digits.
  assert.equal(withEuro('떠도는당근#4947'), '떠도는당근#4947로'); // 칠
  assert.equal(withEuro('야무진젤리#6003'), '야무진젤리#6003으로'); // 삼
  assert.equal(withEuro('행복한라면#1230'), '행복한라면#1230으로'); // 영
  assert.equal(withEuro('행복한라면#1236'), '행복한라면#1236으로'); // 육
  assert.equal(withEuro('행복한라면#1232'), '행복한라면#1232로'); // 이
  assert.equal(withEuro('행복한라면#1231'), '행복한라면#1231로'); // 일
  // Unknown pronunciation falls back to (으)로.
  assert.equal(withEuro('Subway'), 'Subway(으)로');
  assert.equal(withEuro(''), '(으)로');
});
