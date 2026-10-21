'use client';

import { useSyncExternalStore } from 'react';
import { onOtherTabChange } from '@/lib/browser-storage';
import { createListeners } from '@/lib/listeners';

// 공지 읽음: 공지 탭을 열거나 홈의 공지 미리보기를 누르거나 닫으면, 그때의 최신 공지 ID를 이 브라우저에 남깁니다.
// 저장된 ID가 최신 공지와 다르면(처음 온 사용자는 아무것도 없으니) 최신 공지 하나만 안 읽음입니다.
export const NOTICE_READ_KEY = 'notice_read_id';

/** The latest notice is unread unless this browser read it; without storage (null) nothing is. */
export function isNoticeUnread(readId: string | null, latestId: string | null) {
  return latestId !== null && readId !== null && readId !== latestId;
}

const listeners = createListeners();

/** The last read notice id, '' when none, null when storage is unavailable. */
function readId(): string | null {
  try {
    return window.localStorage.getItem(NOTICE_READ_KEY) ?? '';
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  const unsubscribe = listeners.subscribe(listener);
  // Reading in one tab clears the dot in the others.
  const stopOtherTabs = onOtherTabChange(NOTICE_READ_KEY, listener);
  return () => {
    unsubscribe();
    stopOtherTabs();
  };
}

export function markNoticeRead(id: string) {
  if (readId() === id) return;
  try {
    window.localStorage.setItem(NOTICE_READ_KEY, id);
  } catch {
    return; // Storage unavailable: isNoticeUnread already treats everything as read.
  }
  listeners.emit();
}

/** Whether `latestId` is unread here; false on the server so read notices never flash in. */
export function useNoticeUnread(latestId: string | null) {
  return isNoticeUnread(
    useSyncExternalStore(subscribe, readId, () => null),
    latestId,
  );
}
