import { ChevronRightIcon } from '@/components/ui/icons';
import EmptyState from '@/components/ui/empty-state';
import { formatNoticeDate } from '@/lib/notices/model';
import type { NoticeView } from '@/lib/server/notices';
import styles from './notices.module.css';

/** Notices as a list of titles that open to their body; `openId` (the latest) starts open. */
export default function NoticeList({
  notices,
  openId,
}: {
  notices: NoticeView[];
  openId: string | null;
}) {
  if (!notices.length) return <EmptyState title="아직 공지가 없어요." />;
  return (
    <div className={styles.list}>
      {notices.map((notice) => (
        <details key={notice.id} className={styles.notice} open={notice.id === openId}>
          <summary>
            <span className={styles.noticeTitle}>
              {notice.pinned && <span className={`count ${styles.pin}`}>고정</span>}
              {notice.title}
            </span>
            <time dateTime={notice.date}>{formatNoticeDate(notice.date)}</time>
            <ChevronRightIcon size={18} className={styles.chevron} />
          </summary>
          <div className={styles.body} dangerouslySetInnerHTML={{ __html: notice.html }} />
        </details>
      ))}
    </div>
  );
}
