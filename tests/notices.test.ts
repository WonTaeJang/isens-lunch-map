import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  formatNoticeDate,
  isCalendarDate,
  isNoticeFresh,
  latestNotice,
  parseNotice,
  sortNotices,
} from '../lib/notices/model';
import { NOTICE_DIR, readNotices } from '../lib/server/notices';
import { isNoticeUnread } from '../features/notices/notice-read-store';
import { parseNewsTab } from '../features/notices/news-tab';

const file = (front: string, body = '본문') => `---\n${front}\n---\n\n${body}\n`;

test('every notice file in content/notices is valid', () => {
  const { notices, errors } = readNotices(NOTICE_DIR);
  assert.deepEqual(errors, []);
  assert.ok(notices.length > 0);
});

test('parseNotice reads the frontmatter and the body', () => {
  assert.deepEqual(
    parseNotice(
      '2026-10-21-a',
      file('title: "새 소식: 1.0.11"\ndate: 2026-10-21\npinned: true', '# 안녕'),
    ),
    {
      id: '2026-10-21-a',
      title: '새 소식: 1.0.11',
      date: '2026-10-21',
      pinned: true,
      body: '# 안녕',
    },
  );
  assert.equal(parseNotice('a', file('title: 제목\ndate: 2026-10-21')).pinned, false);
  assert.equal(parseNotice('a', '﻿' + file('title: 제목\ndate: 2026-10-21')).title, '제목');
});

test('parseNotice rejects files it cannot read', () => {
  assert.throws(() => parseNotice('a', '제목 없음'), /frontmatter/);
  assert.throws(() => parseNotice('a', file('date: 2026-10-21')), /title/);
  assert.throws(() => parseNotice('a', file('title: 제목\ndate: 2026-02-30')), /date/);
  assert.throws(
    () => parseNotice('a', file('title: 제목\ndate: 2026-10-21\npinned: yes')),
    /pinned/,
  );
  assert.throws(() => parseNotice('a b', file('title: 제목\ndate: 2026-10-21')), /file name/);
  assert.throws(() => parseNotice('a', file('title 제목\ndate: 2026-10-21')), /key: value/);
});

test('readNotices skips invalid files and reports them, and a missing folder has none', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'notices-'));
  try {
    writeFileSync(path.join(dir, 'good.md'), file('title: 좋음\ndate: 2026-10-21'));
    writeFileSync(path.join(dir, 'bad.md'), file('date: 2026-10-21'));
    writeFileSync(path.join(dir, 'note.txt'), 'not a notice');
    const { notices, errors } = readNotices(dir);
    assert.deepEqual(
      notices.map((notice) => notice.id),
      ['good'],
    );
    assert.equal(errors.length, 1);
    assert.match(errors[0], /notice bad: title/);
  } finally {
    rmSync(dir, { recursive: true });
  }
  assert.deepEqual(readNotices(path.join(tmpdir(), 'no-such-notices-dir')), {
    notices: [],
    errors: [],
  });
});

test('pinned notices come first, then newest first; the latest ignores pinning', () => {
  const notices = [
    { id: 'b', date: '2026-10-01', pinned: false },
    { id: 'old-pin', date: '2026-01-01', pinned: true },
    { id: 'a', date: '2026-10-21', pinned: false },
    { id: 'c', date: '2026-10-21', pinned: false },
  ];
  assert.deepEqual(
    sortNotices(notices).map((notice) => notice.id),
    ['old-pin', 'c', 'a', 'b'],
  );
  assert.equal(latestNotice(notices)?.id, 'c');
  assert.equal(latestNotice([]), null);
});

test('the home page shows a notice for the week from its posting day', () => {
  assert.equal(isNoticeFresh('2026-10-21', '2026-10-21'), true);
  assert.equal(isNoticeFresh('2026-10-21', '2026-10-27'), true);
  assert.equal(isNoticeFresh('2026-10-21', '2026-10-28'), false);
  assert.equal(isNoticeFresh('2026-10-21', '2026-10-20'), false);
  assert.equal(isNoticeFresh('2026-12-29', '2027-01-02'), true);
});

test('only the latest notice is unread, and never without storage', () => {
  assert.equal(isNoticeUnread('', 'n2'), true); // first visit
  assert.equal(isNoticeUnread('n1', 'n2'), true);
  assert.equal(isNoticeUnread('n2', 'n2'), false);
  assert.equal(isNoticeUnread(null, 'n2'), false);
  assert.equal(isNoticeUnread('n1', null), false);
});

test('notice dates', () => {
  assert.equal(formatNoticeDate('2026-10-21'), '2026.10.21');
  assert.equal(isCalendarDate('2028-02-29'), true);
  assert.equal(isCalendarDate('2026-13-01'), false);
});

test('the 소식·사용법 page opens 공지 unless ?tab=guide asks for 사용법', () => {
  assert.equal(parseNewsTab(undefined), 'notice');
  assert.equal(parseNewsTab('guide'), 'guide');
  assert.equal(parseNewsTab('notice'), 'notice');
  assert.equal(parseNewsTab(['guide', 'notice']), 'notice');
});
