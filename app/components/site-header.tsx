import Link from "next/link";

export default function SiteHeader({ active }: { active: "map" | "admin" }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Lunch Map 홈"><span className="brand-icon" aria-hidden="true">L<span>•</span></span><span>Lunch Map<small>오늘의 점심, 가까운 곳에서</small></span></Link>
      <nav className="main-nav" aria-label="주 메뉴">
        <Link href="/" aria-current={active === "map" ? "page" : undefined}>점심 지도</Link>
        <Link href="/admin" className="admin-nav-icon" aria-label="리스트 관리" title="리스트 관리" aria-current={active === "admin" ? "page" : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9.5 3-.6 2.2-1.4.8-2.2-.6-2.5 4.2 1.6 1.6v1.6l-1.6 1.6 2.5 4.2 2.2-.6 1.4.8.6 2.2h5l.6-2.2 1.4-.8 2.2.6 2.5-4.2-1.6-1.6v-1.6l1.6-1.6-2.5-4.2-2.2.6-1.4-.8-.6-2.2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
      </nav>
    </header>
  );
}
