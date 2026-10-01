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
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m16 3 5 5L9 20l-6 1 1-6L16 3Zm-2 2 5 5" />
        </svg>
      </button>
      <button
        type="button"
        className="review-action-icon"
        aria-label="리뷰 삭제"
        title="리뷰 삭제"
        disabled={disabled}
        onClick={onDelete}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
        </svg>
      </button>
    </>
  );
}
