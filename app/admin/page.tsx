import type { Metadata } from 'next';
import SiteHeader from '@/components/site-header';
import AdminGate from '@/features/admin/admin-gate';
export const metadata: Metadata = { title: '리스트 관리 | Lunch Map' };
export const runtime = 'nodejs';
export default function AdminPage() {
  return (
    <>
      <SiteHeader active="admin" />
      <main className="page-shell admin-shell">
        <AdminGate />
      </main>
    </>
  );
}
