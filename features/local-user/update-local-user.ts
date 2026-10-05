import { isUuid } from '@/lib/uuid';
import type { LocalIdentity } from './local-user-store';

/** Trims and checks an identity: a UUID (stored lowercase) and a 1-60 character name. */
export function normalizeIdentity(input: LocalIdentity): LocalIdentity {
  const user_id = input.user_id.trim().toLowerCase();
  const user_name = input.user_name.trim();
  if (!isUuid(user_id)) throw new Error('user_id는 올바른 UUID 형식으로 입력해 주세요.');
  if (!user_name || Array.from(user_name).length > 60)
    throw new Error('user_name은 1~60자로 입력해 주세요.');
  return { user_id, user_name };
}

export function updateLocalUser(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  input: LocalIdentity,
) {
  const { user_id, user_name } = normalizeIdentity(input);
  const oldId = storage.getItem('user_id');
  const oldName = storage.getItem('user_name');
  try {
    storage.setItem('user_id', user_id);
    storage.setItem('user_name', user_name);
  } catch {
    try {
      if (oldId === null) storage.removeItem('user_id');
      else storage.setItem('user_id', oldId);
      if (oldName === null) storage.removeItem('user_name');
      else storage.setItem('user_name', oldName);
    } catch {
      /* Storage may remain unavailable; report the failed save below. */
    }
    throw new Error('저장하지 못했어요. 브라우저 저장소 설정을 확인해 주세요.');
  }
}
