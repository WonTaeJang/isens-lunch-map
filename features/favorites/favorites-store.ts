import { FAVORITES_CHANGED_EVENT, FAVORITES_STORAGE_KEY, toggleFavorite } from './favorites';

export function subscribeFavorites(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === FAVORITES_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(FAVORITES_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(FAVORITES_CHANGED_EVENT, onChange);
  };
}

export function getFavoritesSnapshot() {
  try {
    return window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function toggleStoredFavorite(id: string): string | null {
  try {
    toggleFavorite(window.localStorage, id);
    window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
    return null;
  } catch {
    return '저장하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.';
  }
}
