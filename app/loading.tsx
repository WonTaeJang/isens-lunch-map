import LoadingStatus from '@/components/ui/loading-status';

export default function Loading() {
  return (
    <main className="page-shell" aria-busy="true">
      <LoadingStatus page label="페이지를 불러오는 중…" />
    </main>
  );
}
