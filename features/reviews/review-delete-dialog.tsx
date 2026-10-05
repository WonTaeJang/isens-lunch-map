'use client';

import ConfirmDialog from '@/components/ui/confirm-dialog';

export default function ReviewDeleteDialog({
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      title="리뷰를 삭제할까요?"
      description="삭제한 리뷰는 복구할 수 없어요."
      confirmLabel="삭제"
      busy={busy}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
