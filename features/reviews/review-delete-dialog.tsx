'use client';

import ConfirmDialog from '@/components/ui/confirm-dialog';

export default function ReviewDeleteDialog({
  busy,
  error,
  description = '삭제한 리뷰는 복구할 수 없어요.',
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  error?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      title="리뷰를 삭제할까요?"
      description={description}
      confirmLabel="삭제"
      busy={busy}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
