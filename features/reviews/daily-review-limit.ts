import { DAILY_REVIEW_STORAGE_KEY } from './constants';

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const KOREAN_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });

export function getDailyReviewCount(storage: Storage, now = new Date()): number {
  const raw = storage.getItem(DAILY_REVIEW_STORAGE_KEY);
  if (!raw) return 0;
  try {
    const record = JSON.parse(raw);
    return record?.date === KOREAN_DATE.format(now) && Number.isSafeInteger(record.count) && record.count >= 0 ? record.count : 0;
  } catch { return 0; }
}

// Called only after the server has accepted a new review; edits/deletions never change this counter.
export function recordDailyReview(storage: Storage, now = new Date()) {
  storage.setItem(DAILY_REVIEW_STORAGE_KEY, JSON.stringify({ date: KOREAN_DATE.format(now), count: getDailyReviewCount(storage, now) + 1 }));
}
