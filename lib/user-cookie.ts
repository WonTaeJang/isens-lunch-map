/**
 * The browser's user_id, mirrored from localStorage into a cookie so server pages know the viewer
 * on their first render (e.g. to leave out hidden restaurants). localStorage stays the source.
 */
export const USER_COOKIE = 'lunch_user_id';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** A `document.cookie` assignment for `userId`; written on every visit, so it lasts a year from the last one. */
export function userCookie(userId: string, secure: boolean) {
  return `${USER_COOKIE}=${encodeURIComponent(userId)}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure ? '; Secure' : ''}`;
}
