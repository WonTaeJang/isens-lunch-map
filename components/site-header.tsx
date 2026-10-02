'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapIcon, SettingsIcon, TrophyIcon, UserIcon } from '@/components/ui/icons';

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
          className="admin-nav-icon"
          aria-label="점심 지도"
          title="점심 지도"
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          <MapIcon size={22} />
        </Link>
        <Link
          href="/ranking"
          className="admin-nav-icon"
          aria-label="식당 랭킹"
          title="식당 랭킹"
          aria-current={pathname === '/ranking' ? 'page' : undefined}
        >
          <TrophyIcon size={22} />
        </Link>
        <Link
          href="/user"
          className="admin-nav-icon"
          aria-label="내 페이지"
          title="내 페이지"
          aria-current={pathname === '/user' ? 'page' : undefined}
        >
          <UserIcon size={22} />
        </Link>
        <Link
          href="/admin"
          className="admin-nav-icon"
          aria-label="리스트 관리"
          title="리스트 관리"
          aria-current={pathname === '/admin' ? 'page' : undefined}
        >
          <SettingsIcon size={22} />
        </Link>
      </nav>
    </header>
  );
}
