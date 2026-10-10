'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { BlacklistSeed } from '@/lib/blacklist/model';
import type { Blacklist } from './blacklist-store';

const SeedContext = createContext<Blacklist | null>(null);

/**
 * Hands the hidden restaurants the server page looked up (user cookie) to `useBlacklist`, so the
 * first render, on the server and while hydrating, already leaves them out.
 */
export function BlacklistSeedProvider({
  seed,
  children,
}: {
  seed: BlacklistSeed | null;
  children: ReactNode;
}) {
  const value = useMemo(() => seed && { owner: seed.owner, ids: new Set(seed.ids) }, [seed]);
  return <SeedContext value={value}>{children}</SeedContext>;
}

export const useBlacklistSeed = () => useContext(SeedContext);
