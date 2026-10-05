'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpIcon, MapIcon, TrophyIcon, UserIcon } from '@/components/ui/icons';

export default function SiteHeader() {
  const pathname = usePathname();
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
          <UserIcon size={22} />
        </Link>
        <Link
          href="/guide"
          className="nav-icon"
          aria-label="사용법"
          title="사용법"
          aria-current={pathname === '/guide' ? 'page' : undefined}
        >
          <HelpIcon size={22} />
        </Link>
      </nav>
    </header>
  );
}
