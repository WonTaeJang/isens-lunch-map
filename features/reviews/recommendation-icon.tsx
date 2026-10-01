export default function RecommendationIcon({ recommended }: { recommended: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g transform={recommended ? undefined : 'rotate(180 12 12)'}>
        <path d="M7 10H3v11h4V10Zm0 0 5-8a3 3 0 0 1 3 3l-1 5h5a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7" />
      </g>
    </svg>
  );
}
