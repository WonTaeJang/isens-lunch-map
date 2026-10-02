import type { Metadata } from 'next';
import AdminGate from '@/features/admin/admin-gate';
export const metadata: Metadata = { title: '리스트 관리 | Lunch Map' };
export const runtime = 'nodejs';
export default function AdminPage() {
  return (
    <main className="page-shell admin-shell">
      <AdminGate />
    </main>
  );
}
