import 'server-only';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { latestNotice, parseNotice, sortNotices, type Notice } from '@/lib/notices/model';

/** Where the notice files live; next.config.ts includes them in the server deployment. */
export const NOTICE_DIR = path.join(process.cwd(), 'content', 'notices');

/** A notice with its markdown body rendered to HTML. */
export type NoticeView = Omit<Notice, 'body'> & { html: string };

/** Every valid notice in `dir` in list order, with the problems of the invalid files. */
export function readNotices(dir: string) {
  const notices: Notice[] = [];
  const errors: string[] = [];
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((file) => file.endsWith('.md'));
  } catch (error) {
    // No folder means no notices yet; anything else is worth reporting.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') errors.push(String(error));
  }
  for (const file of files) {
    try {
      notices.push(parseNotice(file.slice(0, -3), readFileSync(path.join(dir, file), 'utf8')));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return { notices: sortNotices(notices), errors };
}

let cached: NoticeView[] | null = null;

/**
 * The notices in list order. The files only change with a deploy, so production reads them once.
 * The markdown is ours (from this repository), so its HTML is rendered as it is.
 */
export function getNotices(): NoticeView[] {
  if (cached) return cached;
  const { notices, errors } = readNotices(NOTICE_DIR);
  // An invalid file is left out rather than taking pages down; tests/notices.test.ts checks the files.
  for (const message of errors) console.error(message);
  const views = notices.map(({ body, ...notice }) => ({
    ...notice,
    html: marked.parse(body, { async: false }),
  }));
  if (process.env.NODE_ENV === 'production') cached = views;
  return views;
}

export function getLatestNotice() {
  return latestNotice(getNotices());
}
