import type { ReactNode } from 'react';
import { reviewTimestamp, type Review } from '@/lib/reviews/model';
import RecommendationBadge from './recommendation-badge';
import ReviewActionIcons from './review-action-icons';
import ReviewFooter from './review-footer';
import list from './review-list.module.css';

const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const join = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

type Props = {
  review: Review;
  /** The heading's left side: the author in a restaurant's list, the restaurant on the user page. */
  title: ReactNode;
  /** 수정·삭제 icons, for the viewer's own reviews. */
  actions?: { disabled: boolean; onEdit: () => void; onDelete: () => void };
  /** Lines between the heading and the date (e.g. an inactive restaurant). */
  notices?: ReactNode;
  /** Shown instead of the content and footer while this review is being edited. */
  editor?: ReactNode;
  likeDisabled?: boolean;
  /** Extra classes a page adds to the shared list styles. */
  classNames?: { item?: string; heading?: string; content?: string; tags?: string };
};

/** One review in a list: heading with 추천 badge and actions, date, content, tags and 좋아요. */
export default function ReviewItem({
  review,
  title,
  actions,
  notices,
  editor,
  likeDisabled,
  classNames = {},
}: Props) {
  return (
    <li className={join(list.item, classNames.item)}>
      <div className={join(list.itemHeading, classNames.heading)}>
        {title}
        <div className={list.headingActions}>
          <RecommendationBadge recommended={review.is_recommended} className={list.headingBadge} />
          {actions && <ReviewActionIcons {...actions} />}
        </div>
      </div>
      {notices}
      <p className="subtle">
        {DATE_FORMAT.format(new Date(reviewTimestamp(review)))}
        {review.updated_at && ' · 수정됨'}
      </p>
      {editor ?? (
        <>
          {review.content && (
            <p className={join(list.content, classNames.content)}>{review.content}</p>
          )}
          <ReviewFooter
            review={review}
            likeDisabled={likeDisabled}
            tagsClassName={classNames.tags}
          />
        </>
      )}
    </li>
  );
}
