// 공지사항: content/notices/*.md 파일 하나가 공지 하나입니다(파일 이름이 공지 ID).
// 파일 맨 위 frontmatter에 title, date(게시일, YYYY-MM-DD), pinned(선택, true면 목록 맨 위)를 적고
// 그 아래에 마크다운 본문을 씁니다.

export type Notice = { id: string; title: string; date: string; pinned: boolean; body: string };

/** Days the home page previews the latest notice, counting the posting day. */
export const NOTICE_PREVIEW_DAYS = 7;

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;
const NOTICE_ID = /^[\w.-]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real YYYY-MM-DD date (not 2026-02-30). */
export function isCalendarDate(value: string) {
  if (!DATE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function unquote(value: string) {
  return /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
}

/** One notice from its file name (without .md) and text; throws the reason when the file is invalid. */
export function parseNotice(id: string, text: string): Notice {
  const fail = (reason: string): never => {
    throw new Error(`notice ${id}: ${reason}`);
  };
  if (!NOTICE_ID.test(id)) fail('use only letters, numbers, ".", "-" and "_" in the file name');
  const match = FRONTMATTER.exec(text.replace(/^﻿/, ''));
  if (!match) return fail('start the file with a --- frontmatter block');
  const fields = new Map<string, string>();
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const colon = line.indexOf(':');
    if (colon < 0) fail(`"${line}" is not "key: value"`);
    fields.set(line.slice(0, colon).trim(), unquote(line.slice(colon + 1).trim()));
  }
  const title = fields.get('title') ?? '';
  const date = fields.get('date') ?? '';
  const pinned = fields.get('pinned') ?? 'false';
  if (!title) fail('title is missing');
  if (!isCalendarDate(date)) fail(`date "${date}" is not YYYY-MM-DD`);
  if (pinned !== 'true' && pinned !== 'false') fail(`pinned "${pinned}" is not true or false`);
  return { id, title, date, pinned: pinned === 'true', body: match[2].trim() };
}

type Dated = Pick<Notice, 'id' | 'date'>;

/** Newest first: by date, then by file name for notices of the same day. */
function newestFirst(a: Dated, b: Dated) {
  return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
}

/** List order: pinned notices first, each group newest first. */
export function sortNotices<T extends Dated & Pick<Notice, 'pinned'>>(notices: readonly T[]): T[] {
  return [...notices].sort((a, b) => Number(b.pinned) - Number(a.pinned) || newestFirst(a, b));
}

/** The most recently posted notice, pinned or not: the one the unread dot and the home notice are about. */
export function latestNotice<T extends Dated>(notices: readonly T[]): T | null {
  return notices.reduce<T | null>(
    (latest, notice) => (!latest || newestFirst(notice, latest) < 0 ? notice : latest),
    null,
  );
}

/** Whether the home page still shows a notice posted on `date`, given Korea's `today`. */
export function isNoticeFresh(date: string, today: string, days = NOTICE_PREVIEW_DAYS) {
  const age = (Date.parse(today) - Date.parse(date)) / 86_400_000;
  return age >= 0 && age < days;
}

/** 2026-10-21 → 2026.10.21 */
export function formatNoticeDate(date: string) {
  return date.replaceAll('-', '.');
}
