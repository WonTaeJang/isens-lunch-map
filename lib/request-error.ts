import { isUuid } from './uuid';

/**
 * An expected request error: its message is shown to the user and sent with `status`.
 * Each API keeps its own subclass (BlacklistError, ReviewError, AdminError…), so an error still
 * says where it came from, while API routes answer any of them the same way.
 */
export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/** The lowercased UUID in `value`; anything else throws `Fail`. */
export function requireUuid(value: unknown, Fail: new (message: string) => RequestError): string {
  if (!isUuid(value)) throw new Fail('식별 정보가 올바르지 않아요.');
  return value.toLowerCase();
}

/** A trimmed nickname of 1 to 60 characters; anything else throws `Fail`. */
export function requireUserName(value: unknown, Fail: new (message: string) => RequestError) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || Array.from(name).length > 60) throw new Fail('닉네임 정보를 확인해 주세요.');
  return name;
}
