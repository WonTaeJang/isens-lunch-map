import Link from 'next/link';
import EmptyState from '@/components/ui/empty-state';

export default function NotFound() {
  return (
    <main className="page-shell">
      <EmptyState
        icon="⌖"
        title="페이지를 찾을 수 없어요"
        description="주소가 바뀌었거나 삭제된 페이지입니다."
        action={
          <Link href="/" className="text-link">
            점심 지도로 돌아가기
          </Link>
        }
      />
    </main>
  );
}
