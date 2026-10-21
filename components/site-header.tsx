'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapIcon, MegaphoneIcon, TrophyIcon, UserIcon } from '@/components/ui/icons';
import NavGradeIcon from '@/features/grade/nav-grade-icon';
import { NEWS_PATH } from '@/features/notices/news-tab';
import { useNoticeUnread } from '@/features/notices/notice-read-store';

/** `latestNoticeId`: the newest notice, which puts a dot on 소식·사용법 until this browser reads it. */
export default function SiteHeader({ latestNoticeId }: { latestNoticeId: string | null }) {
  const pathname = usePathname();
  const noticeUnread = useNoticeUnread(latestNoticeId);
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Lunch Map 홈">
        <span className="brand-icon" aria-hidden="true">
          L<span>•</span>
        </span>
        <span>
          Lunch Map<small>오늘의 점심, 가까운 곳에서</small>
        </span>
      </Link>
      <nav className="main-nav" aria-label="주 메뉴">
        <Link
          href="/"
          className="nav-icon"
          aria-label="점심 지도"
          title="점심 지도"
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          <MapIcon size={22} />
        </Link>
        <Link
          href="/ranking"
          className="nav-icon"
          aria-label="점심 랭킹"
          title="점심 랭킹"
          aria-current={pathname === '/ranking' ? 'page' : undefined}
        >
          <TrophyIcon size={22} />
        </Link>
        <Link
          href="/user"
          className="nav-icon"
          aria-label="내 페이지"
          title="내 페이지"
          aria-current={pathname === '/user' ? 'page' : undefined}
        >
          <NavGradeIcon fallback={<UserIcon size={22} />} />
        </Link>
        <Link
          href={NEWS_PATH}
          className="nav-icon"
          aria-label={noticeUnread ? '소식·사용법, 새 공지 있음' : '소식·사용법'}
          title="소식·사용법"
          aria-current={pathname === NEWS_PATH ? 'page' : undefined}
        >
          <MegaphoneIcon size={22} />
          {noticeUnread && <span className="nav-dot" aria-hidden="true" />}
        </Link>
      </nav>
    </header>
  );
}
