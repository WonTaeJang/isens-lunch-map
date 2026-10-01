export default function ReviewedBadge() {
  return (
    <span
      className="restaurant-card-reviewed"
      role="img"
      aria-label="내 리뷰 작성됨"
      title="내 리뷰 작성됨"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m3 8 3 3 7-7" />
      </svg>
    </span>
  );
}
