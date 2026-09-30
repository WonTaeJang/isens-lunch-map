import { randFood, randModifier, randSuffix } from 'randino';

export const LOCAL_USER_KEYS = {
  id: 'user_id',
  name: 'user_name',
} as const;

const FOOD_OPTIONS = { language: 'ko', count: 1 } as const;
// randino 1.1 uses the built-in modifier pool; style 0 keeps real words.
const MODIFIER_OPTIONS = { language: 'ko', style: 0, separator: '' } as const;
const SUFFIX_OPTIONS = { length: 4, charset: '0123456789', separator: '#' } as const;

export function createUserName(): string {
  const [food] = randFood(FOOD_OPTIONS);
  const name = randModifier(food, MODIFIER_OPTIONS);
  return randSuffix(name, SUFFIX_OPTIONS);
}

// Local identity is for display only; it must not authorize server mutations.
export function ensureLocalUser(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  const storedId = storage.getItem(LOCAL_USER_KEYS.id);
  const storedName = storage.getItem(LOCAL_USER_KEYS.name);
  const userId = storedId?.trim() ? storedId : crypto.randomUUID();
  const userName = storedName?.trim() ? storedName : createUserName();

  if (userId !== storedId) storage.setItem(LOCAL_USER_KEYS.id, userId);
  if (userName !== storedName) storage.setItem(LOCAL_USER_KEYS.name, userName);

  return { user_id: userId, user_name: userName };
}
