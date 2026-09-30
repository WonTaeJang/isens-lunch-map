import Link from "next/link";

export default function SiteHeader({ active }: { active: "map" | "admin" }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Lunch Map 홈"><span className="brand-icon" aria-hidden="true">L<span>•</span></span><span>Lunch Map<small>오늘의 점심, 가까운 곳에서</small></span></Link>
      <nav className="main-nav" aria-label="주 메뉴">
        <Link href="/" aria-current={active === "map" ? "page" : undefined}>점심 지도</Link>
        <Link href="/admin" aria-current={active === "admin" ? "page" : undefined}>리스트 관리</Link>
      </nav>
    </header>
  );
}
