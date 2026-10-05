// 다른 기기에서 이어 쓰기: user_id와 user_name을 링크에 담고 다시 꺼냅니다.
// 값은 base64url로만 바꾼 것이라 암호화가 아닙니다. 링크를 가진 사람은 같은 사용자로 쓸 수 있습니다.
// 링크는 `#` 뒤(fragment)에 담아 서버 요청과 로그에 남지 않게 합니다.
import type { LocalIdentity } from './local-user-store';
import { normalizeIdentity } from './update-local-user';

const PREFIX = 'LM1.';
const HASH_KEY = 'import';

function toBase64Url(text: string) {
  const binary = Array.from(new TextEncoder().encode(text), (byte) =>
    String.fromCharCode(byte),
  ).join('');
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function fromBase64Url(value: string) {
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'));
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(binary, (char) => char.charCodeAt(0)),
  );
}

export function encodeIdentity({ user_id, user_name }: LocalIdentity) {
  return PREFIX + toBase64Url(JSON.stringify({ i: user_id, n: user_name }));
}

/** Returns null for anything that is not a valid, current-version identity code. */
export function decodeIdentity(code: string): LocalIdentity | null {
  if (!code.startsWith(PREFIX)) return null;
  try {
    const data: unknown = JSON.parse(fromBase64Url(code.slice(PREFIX.length)));
    if (!data || typeof data !== 'object') return null;
    const { i, n } = data as Record<string, unknown>;
    if (typeof i !== 'string' || typeof n !== 'string') return null;
    // Same rules as saving, so a link never carries an identity that cannot be stored.
    return normalizeIdentity({ user_id: i, user_name: n });
  } catch {
    return null;
  }
}

/** Link that opens the user page on another device and offers to continue as this user. */
export function identityLink(origin: string, identity: LocalIdentity) {
  return `${origin}/user#${HASH_KEY}=${encodeIdentity(identity)}`;
}

/**
 * Reads `#import=…` from a location hash.
 * `undefined`: no import link. `null`: an import link that is broken or from another version.
 */
export function identityFromHash(hash: string): LocalIdentity | null | undefined {
  const prefix = `#${HASH_KEY}=`;
  if (!hash.startsWith(prefix)) return undefined;
  return decodeIdentity(decodeURIComponent(hash.slice(prefix.length)));
}
