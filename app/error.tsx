'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/button';
import EmptyState from '@/components/ui/empty-state';

// Server errors reach the client as a generic message plus digest, so never render error.message.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-shell">
      <EmptyState
        role="alert"
        icon="!"
        title="정보를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 알려 주세요."
        action={<Button onClick={() => retry()}>다시 시도</Button>}
      />
    </main>
  );
}
