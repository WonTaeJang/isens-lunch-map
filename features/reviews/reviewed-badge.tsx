import { CheckIcon } from '@/components/ui/icons';

export default function ReviewedBadge() {
  return (
    <span
      className="restaurant-card-reviewed"
      role="img"
      aria-label="내 리뷰 작성됨"
      title="내 리뷰 작성됨"
    >
      <CheckIcon size={12} />
    </span>
  );
}
