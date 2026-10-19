// 브라우저 저장소(localStorage)를 쓰는 store들의 공통 부분: 읽기, 다른 탭의 변경 감지, ID 목록 해석.

/** The stored value of `key`, or '' when missing or storage is unavailable (a stable snapshot). */
export function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Calls `listener` when another tab changes `key` or clears storage; returns the removal. */
export function onOtherTabChange(key: string, listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/** A stored JSON array of ids: unique non-empty strings in order; anything else reads as none. */
export function parseIdList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(value.filter((id): id is string => typeof id === 'string' && id.trim() !== '')),
    ];
  } catch {
    return [];
  }
}
