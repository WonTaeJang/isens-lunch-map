import { onOtherTabChange, readStorage } from '@/lib/browser-storage';
import { FAVORITES_CHANGED_EVENT, FAVORITES_STORAGE_KEY, toggleFavorite } from './favorites';

export function subscribeFavorites(onChange: () => void) {
  const stopOtherTabs = onOtherTabChange(FAVORITES_STORAGE_KEY, onChange);
  window.addEventListener(FAVORITES_CHANGED_EVENT, onChange);
  return () => {
    stopOtherTabs();
    window.removeEventListener(FAVORITES_CHANGED_EVENT, onChange);
  };
}

export const getFavoritesSnapshot = () => readStorage(FAVORITES_STORAGE_KEY);

export function toggleStoredFavorite(id: string): string | null {
  try {
    toggleFavorite(window.localStorage, id);
    window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
    return null;
  } catch {
    return '저장하지 못했어요. 브라우저 저장소 설정을 확인해 주세요.';
  }
}
