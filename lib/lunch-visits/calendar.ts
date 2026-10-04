// 점심 기록 캘린더: 달력 칸 계산과 월간 요약 (날짜는 모두 한국 날짜 문자열 YYYY-MM-DD)
import type { LunchVisit } from './model';

/** YYYY-MM of a Korean date (YYYY-MM-DD). */
export function monthOf(date: string) {
  return date.slice(0, 7);
}

function parseMonth(month: string) {
  const [year, value] = month.split('-').map(Number);
  return { year, index: value - 1 };
}
const pad = (value: number) => String(value).padStart(2, '0');

/** The month `delta` months away, e.g. shiftMonth('2026-01', -1) → '2025-12'. */
export function shiftMonth(month: string, delta: number) {
  const { year, index } = parseMonth(month);
  const date = new Date(Date.UTC(year, index + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/**
 * Weeks of the month, Sunday first. Each cell is a YYYY-MM-DD date,
 * or null for the blank days before the 1st and after the last day.
 */
export function buildMonthGrid(month: string): (string | null)[][] {
  const { year, index } = parseMonth(month);
  const firstWeekday = new Date(Date.UTC(year, index, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= days; day++) cells.push(`${month}-${pad(day)}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7));
  return weeks;
}

export type MonthSummary = {
  count: number;
  /** Most visited restaurant when it was visited more than once; ties go to the latest visit. */
  favorite: { name: string; count: number } | null;
};
export function summarizeMonth(visits: readonly LunchVisit[]): MonthSummary {
  const counts = new Map<string, { name: string; count: number; last: string }>();
  for (const visit of visits) {
    const entry = counts.get(visit.restaurant_id) ?? {
      name: visit.restaurant_name,
      count: 0,
      last: '',
    };
    entry.count++;
    if (visit.visit_date > entry.last) entry.last = visit.visit_date;
    counts.set(visit.restaurant_id, entry);
  }
  let best: { name: string; count: number; last: string } | null = null;
  for (const entry of counts.values())
    if (!best || entry.count > best.count || (entry.count === best.count && entry.last > best.last))
      best = entry;
  return {
    count: visits.length,
    favorite: best && best.count > 1 ? { name: best.name, count: best.count } : null,
  };
}
