// 오늘의 점심 기록: 서버 검증과 화면에서 함께 쓰는 타입과 입력 검증
import { isUuid } from '@/lib/uuid';

export type LunchVisit = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_category: string | null;
  restaurant_active: boolean | null;
  /** Korean (Asia/Seoul) calendar date, YYYY-MM-DD. */
  visit_date: string;
  created_at: string;
  updated_at: string | null;
};

export class LunchVisitError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function visitUuid(value: unknown): string {
  if (!isUuid(value)) throw new LunchVisitError('식별 정보가 올바르지 않아요.');
  return value.toLowerCase();
}
export function visitUserName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || Array.from(name).length > 60)
    throw new LunchVisitError('닉네임 정보를 확인해 주세요.');
  return name;
}

/** Calendar month, YYYY-MM (Korean dates). */
export function visitMonth(raw: string | null): string {
  if (!raw || !/^\d{4}-(0[1-9]|1[0-2])$/.test(raw))
    throw new LunchVisitError('조회할 달을 확인해 주세요.');
  return raw;
}

const KOREAN_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
/** Today's date in Korea (00:00-24:00 KST), YYYY-MM-DD — the same day the server records. */
export function koreanToday(now = new Date()) {
  return KOREAN_DATE.format(now);
}

type TodayLunchAction = 'choose' | 'cancel' | 'change';
/** What tapping "오늘의 점심" on a restaurant does, given today's current record. */
export function todayLunchAction(
  visit: Pick<LunchVisit, 'restaurant_id' | 'visit_date'> | null,
  restaurantId: string,
  today = koreanToday(),
): TodayLunchAction {
  if (!visit || visit.visit_date !== today) return 'choose';
  return visit.restaurant_id === restaurantId ? 'cancel' : 'change';
}
