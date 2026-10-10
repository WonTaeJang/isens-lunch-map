import 'server-only';
import { cookies } from 'next/headers';
import type { Pool } from 'pg';
import type { BlacklistSeed } from '@/lib/blacklist/model';
import { logUnexpectedError } from '@/lib/server/api-route';
import { listBlacklistIds } from '@/lib/server/blacklist';
import { USER_COOKIE } from '@/lib/user-cookie';
import { isUuid } from '@/lib/uuid';

/**
 * The viewer's hidden restaurant ids, when the user cookie names them, so the page renders without
 * them from the start. Null without a cookie or on failure: the browser then loads them itself.
 */
export async function getViewerBlacklist(db: Pool): Promise<BlacklistSeed | null> {
  const value = (await cookies()).get(USER_COOKIE)?.value;
  if (!isUuid(value)) return null;
  const owner = value.toLowerCase();
  try {
    return { owner, ids: await listBlacklistIds(db, owner) };
  } catch (error) {
    logUnexpectedError('Viewer blacklist lookup failed', error);
    return null;
  }
}
