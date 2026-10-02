import { PencilIcon, TrashIcon } from '@/components/ui/icons';

type Props = { disabled: boolean; onEdit: () => void; onDelete: () => void };

export default function ReviewActionIcons({ disabled, onEdit, onDelete }: Props) {
  return (
    <>
      <button
        type="button"
        className="review-action-icon"
        aria-label="리뷰 수정"
        title="리뷰 수정"
        disabled={disabled}
        onClick={onEdit}
      >
        <PencilIcon size={17} strokeWidth="1.7" />
      </button>
      <button
        type="button"
        className="review-action-icon"
        aria-label="리뷰 삭제"
        title="리뷰 삭제"
        disabled={disabled}
        onClick={onDelete}
      >
        <TrashIcon size={17} strokeWidth="1.7" />
      </button>
    </>
  );
}
