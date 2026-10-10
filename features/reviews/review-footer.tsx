import { REVIEW_TAGS } from '@/lib/reviews/constants';
import type { Review } from '@/lib/reviews/model';
import ReviewLikeButton from './review-like-button';

/** Bottom row of a review in a list: its tags, and 좋아요 at the end. */
export default function ReviewFooter({ review }: { review: Review }) {
  return (
    <div className="review-item-footer">
      <div className="review-tags">
        {review.tags.map((tag) => (
          <span key={tag}>{REVIEW_TAGS.find((option) => option.value === tag)?.label}</span>
        ))}
      </div>
      <ReviewLikeButton key={`${review.id}:${review.like_count}:${review.liked}`} review={review} />
    </div>
  );
}
