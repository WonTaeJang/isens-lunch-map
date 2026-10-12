import { REVIEW_TAGS } from '@/lib/reviews/constants';
import type { Review } from '@/lib/reviews/model';
import ReviewLikeButton from './review-like-button';
import list from './review-list.module.css';

/** Bottom row of a review in a list: its tags, and 좋아요 at the end (`likeDisabled` blocks it).
 * `tagsClassName` lets a page restyle the tags (e.g. muted for an inactive restaurant). */
export default function ReviewFooter({
  review,
  likeDisabled = false,
  tagsClassName,
}: {
  review: Review;
  likeDisabled?: boolean;
  tagsClassName?: string;
}) {
  return (
    <div className={list.itemFooter}>
      <div className={tagsClassName ? `${list.tags} ${tagsClassName}` : list.tags}>
        {review.tags.map((tag) => (
          <span key={tag}>{REVIEW_TAGS.find((option) => option.value === tag)?.label}</span>
        ))}
      </div>
      <ReviewLikeButton
        key={`${review.id}:${review.like_count}:${review.liked}`}
        review={review}
        disabled={likeDisabled}
      />
    </div>
  );
}
