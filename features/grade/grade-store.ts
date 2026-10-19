'use client';

import { onOtherTabChange, readStorage } from '@/lib/browser-storage';
import { createListeners } from '@/lib/listeners';
import { useSyncExternalStore } from 'react';
import { isTierId, tierRank, type PromotedTierId, type TierId } from '@/lib/grades/model';

/**
 * The browser keeps the user's grade so any page can show it without asking the server. The user
 * page recomputes it from the activity counts and only ever raises it (the best tier reached).
 */
export const GRADE_STORAGE_KEY = 'user_grade';
const GRADE_CHANGED_EVENT = 'lunch-map:grade-changed';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** The stored tier when it belongs to `userId` (another identity's grade is ignored). */
export function parseStoredTier(raw: string | null, userId: string): TierId | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { user_id?: unknown; tier?: unknown };
    return typeof value.user_id === 'string' &&
      value.user_id.toLowerCase() === userId.toLowerCase() &&
      isTierId(value.tier)
      ? value.tier
      : null;
  } catch {
    return null;
  }
}

/**
 * Raises the stored tier to `reached` when it is higher (or nothing is stored for this user) and
 * says whether that was a promotion: a first grade for this browser is stored without one.
 */
export function promoteStoredTier(
  storage: Storage,
  userId: string,
  reached: TierId,
  now = new Date(),
): { tier: TierId; promotedFrom: TierId | null } {
  const stored = parseStoredTier(storage.getItem(GRADE_STORAGE_KEY), userId);
  if (stored && tierRank(stored) >= tierRank(reached)) return { tier: stored, promotedFrom: null };
  storage.setItem(
    GRADE_STORAGE_KEY,
    JSON.stringify({ user_id: userId.toLowerCase(), tier: reached, checked_at: now.toISOString() }),
  );
  return { tier: reached, promotedFrom: stored };
}

function subscribe(onChange: () => void) {
  const stopOtherTabs = onOtherTabChange(GRADE_STORAGE_KEY, onChange);
  window.addEventListener(GRADE_CHANGED_EVENT, onChange);
  return () => {
    stopOtherTabs();
    window.removeEventListener(GRADE_CHANGED_EVENT, onChange);
  };
}

const getSnapshot = () => readStorage(GRADE_STORAGE_KEY);

/** A rise to a higher tier, waiting to be celebrated (kept in memory until dismissed). */
export type Promotion = { from: TierId; to: PromotedTierId };
let promotion: Promotion | null = null;
const promotionListeners = createListeners();

function setPromotion(next: Promotion | null) {
  promotion = next;
  promotionListeners.emit();
}

export function dismissPromotion() {
  setPromotion(null);
}

const subscribePromotion = promotionListeners.subscribe;

/** The promotion not yet celebrated, if any. */
export function usePromotion() {
  return useSyncExternalStore(
    subscribePromotion,
    () => promotion,
    () => null,
  );
}

/** Stores the tier reached on the user page and announces a promotion (see usePromotion). */
export function saveReachedTier(userId: string, reached: TierId) {
  try {
    const { tier, promotedFrom } = promoteStoredTier(window.localStorage, userId, reached);
    window.dispatchEvent(new Event(GRADE_CHANGED_EVENT));
    if (promotedFrom && tier !== 'iron') setPromotion({ from: promotedFrom, to: tier });
  } catch {
    // Storage unavailable: the computed tier is still shown, just not remembered.
  }
}

/** The grade this browser keeps for `userId` (null until stored, e.g. before a user page visit). */
export function useStoredTier(userId: string | null): TierId | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => '');
  return userId ? parseStoredTier(raw, userId) : null;
}
