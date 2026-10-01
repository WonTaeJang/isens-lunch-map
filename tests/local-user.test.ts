import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUserName, ensureLocalUser } from '../features/local-user/local-user';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

test('new visitor gets a persisted UUID and Korean nickname with four digits', () => {
  const storage = memoryStorage();
  const user = ensureLocalUser(storage);
  assert.match(
    user.user_id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.match(user.user_name, /^[가-힣]+#[0-9]{4}$/);
  assert.equal(storage.getItem('user_id'), user.user_id);
  assert.equal(storage.getItem('user_name'), user.user_name);
  assert.deepEqual(ensureLocalUser(storage), user);
});

test('existing values are preserved and only missing fields are repaired', () => {
  const existing = { user_id: crypto.randomUUID(), user_name: '기존만두#0007' };
  assert.deepEqual(ensureLocalUser(memoryStorage(existing)), existing);
  assert.equal(
    ensureLocalUser(memoryStorage({ user_id: existing.user_id })).user_id,
    existing.user_id,
  );
  assert.equal(
    ensureLocalUser(memoryStorage({ user_name: existing.user_name })).user_name,
    existing.user_name,
  );
  const repaired = ensureLocalUser(memoryStorage({ user_id: '', user_name: '  ' }));
  assert.ok(repaired.user_id);
  assert.match(repaired.user_name, /^[가-힣]+#[0-9]{4}$/);
});

test('nickname generator produces the expected display format', () => {
  for (let i = 0; i < 30; i++) assert.match(createUserName(), /^[가-힣]+#[0-9]{4}$/);
});
