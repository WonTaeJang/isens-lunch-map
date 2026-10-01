import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateLocalUser } from '../features/local-user/update-local-user';
const id = '11111111-1111-4111-8111-111111111111';
function storage() {
  const data = new Map<string, string>([['user_id', id], ['user_name', '기존이름'], ['favorites', 'keep']]);
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
}
test('identity editor saves trimmed values without changing favorites', () => {
  const s = storage();
  updateLocalUser(s, { user_id: id, user_name: ' 새이름 ' });
  assert.equal(s.getItem('user_name'), '새이름');
  assert.equal(s.getItem('favorites'), 'keep');
});
test('invalid identity inputs leave existing identity intact', () => {
  const s = storage();
  for (const input of [{ user_id: 'bad', user_name: '이름' }, { user_id: id, user_name: ' ' }, { user_id: id, user_name: '가'.repeat(61) }]) assert.throws(() => updateLocalUser(s, input));
  assert.equal(s.getItem('user_name'), '기존이름');
  assert.equal(s.getItem('user_id'), id);
});
test('partial storage failure restores original identity', () => {
  const s = storage();
  const save = s.setItem;
  s.setItem = (key, value) => { if (value === '새이름') throw new Error('quota'); save(key, value); };
  assert.throws(() => updateLocalUser(s, { user_id: '22222222-2222-4222-8222-222222222222', user_name: '새이름' }));
  assert.equal(s.getItem('user_id'), id);
  assert.equal(s.getItem('user_name'), '기존이름');
});
