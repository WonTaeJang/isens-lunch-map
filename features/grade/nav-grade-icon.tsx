'use client';

import type { ReactNode } from 'react';
import useLocalUser from '@/features/local-user/use-local-user';
import { useStoredTier } from './grade-store';
import TierIcon from './tier-icon';

/**
 * The header's 내 페이지 icon: the viewer's tier crest from the moment the user page stores a
 * grade in this browser, `fallback` until then.
 */
export default function NavGradeIcon({ fallback }: { fallback: ReactNode }) {
  const { identity } = useLocalUser();
  const tier = useStoredTier(identity?.user_id ?? null);
  return tier ? <TierIcon tier={tier} size={28} /> : fallback;
}
