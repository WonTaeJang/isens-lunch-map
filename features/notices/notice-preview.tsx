'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CloseIcon, MegaphoneIcon } from '@/components/ui/icons';
import { prefersReducedMotion } from '@/lib/motion';
import { NEWS_PATH } from './news-tab';
import { markNoticeRead, useNoticeUnread } from './notice-read-store';
import styles from './notices.module.css';

/**
 * The latest notice's title on the home page until it is read or closed: at the end of the
 * subtitle line on wide screens, floating at the bottom center on narrow ones.
 * `notice` is null when there is nothing to show (no notice, or posted over a week ago).
 */
export default function NoticePreview({
  notice,
}: {
  notice: { id: string; title: string } | null;
}) {
  const unread = useNoticeUnread(notice?.id ?? null);
  const [closing, setClosing] = useState(false);
  if (!notice || !unread) return null;
  const read = () => markNoticeRead(notice.id);
  // Closing slides it down first and marks it read when that ends (at once with reduced motion).
  const close = () => {
    if (prefersReducedMotion()) read();
    else setClosing(true);
  };
  return (
    <aside
      className={styles.preview}
      aria-label="새 공지"
      data-closing={closing || undefined}
      onAnimationEnd={closing ? read : undefined}
    >
      <Link href={NEWS_PATH} className={styles.previewLink} onClick={read}>
        <MegaphoneIcon size={16} />
        <span className={styles.previewTitle}>{notice.title}</span>
      </Link>
      <button
        type="button"
        className={styles.previewClose}
        aria-label="공지 닫기"
        title="닫기"
        onClick={close}
        disabled={closing}
      >
        <CloseIcon size={14} />
      </button>
    </aside>
  );
}
