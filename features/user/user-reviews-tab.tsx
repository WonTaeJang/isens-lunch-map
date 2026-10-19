'use client';

import Link from 'next/link';
import Button from '@/components/ui/button';
import LoadingStatus from '@/components/ui/loading-status';
import HiddenBadge from '@/features/blacklist/hidden-badge';
import type { LocalIdentity } from '@/features/local-user/local-user-store';
import list from '@/features/reviews/review-list.module.css';
import ReviewForm from '@/features/reviews/review-form';
import ReviewItem from '@/features/reviews/review-item';
import type useReviewActions from '@/features/reviews/use-review-actions';
import { hasCoordinates } from '@/lib/coordinates';
import { restaurantMapHref } from '@/lib/map-link';
import type { UserReview, UserReviewPage } from '@/lib/reviews/model';
import styles from './user.module.css';

type Props = {
  identity: LocalIdentity | null;
  page: UserReviewPage | null;
  loading: boolean;
  busy: boolean;
  error: string;
  load: (more?: boolean) => Promise<unknown>;
  actions: ReturnType<typeof useReviewActions<UserReview>>;
  /** The viewer's hidden restaurants: their reviews are only shown, marked 숨김. */
  hidden: ReadonlySet<string> | null;
};

/** 내 리뷰 tab: the viewer's reviews with edit and delete. The feed lives in the dashboard,
 * which also shows its totals and progress. */
export default function UserReviewsTab({
  identity,
  page,
  loading,
  busy,
  error,
  load,
  actions,
  hidden,
}: Props) {
  const { notice, editing, setError } = actions;
  return (
    <section className={styles.userRecords} aria-label="내 리뷰">
      {error && (
        <div className="error-text" role="alert">
          {error}{' '}
          <Button
            className={styles.spacedButton}
            disabled={loading || busy || Boolean(editing)}
            onClick={() => {
              setError('');
              if (identity) void load();
              else window.location.reload();
            }}
          >
            다시 불러오기
          </Button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {loading && !page?.hasMore && <LoadingStatus label="내 리뷰를 불러오는 중…" />}
      {page?.total === 0 && !loading && (
        <div className={list.empty}>
          아직 작성한 리뷰가 없어요.{' '}
          <Link href="/" className="text-link">
            점심 지도에서 식당 찾아보기
          </Link>
        </div>
      )}
      <ul className={`${list.list} ${styles.userList}`}>
        {page?.reviews.map((review) => {
          // A review of a hidden restaurant is only shown, marked 숨김: no link, edit or delete.
          const isHidden = hidden?.has(review.restaurant_id) ?? false;
          const usable = review.restaurant_active && !isHidden;
          return (
            <ReviewItem
              key={review.id}
              review={review}
              classNames={{
                item: `${styles.userItem}${usable ? '' : ` ${styles.userRestaurantInactive}`}`,
                heading: styles.userItemHeading,
                content: styles.userContent,
                tags: styles.userTags,
              }}
              title={
                <h2>
                  {usable && hasCoordinates(review) ? (
                    <Link href={restaurantMapHref(review.restaurant_id)}>
                      {review.restaurant_name}
                    </Link>
                  ) : (
                    review.restaurant_name
                  )}
                  {isHidden && <HiddenBadge />}
                </h2>
              }
              actions={{
                disabled: busy || loading || Boolean(editing) || isHidden,
                onEdit: () => actions.startEdit(review),
                onDelete: () => actions.startDelete(review),
              }}
              notices={
                <>
                  {!review.restaurant_active && <p className="subtle">현재 비활성 식당이에요.</p>}
                  {review.restaurant_active && !hasCoordinates(review) && (
                    <p className="subtle">위치 정보 없음 · 지도에 표시되지 않아요</p>
                  )}
                </>
              }
              editor={
                editing?.id === review.id ? (
                  <ReviewForm
                    key={editing.id}
                    review={editing}
                    busy={busy || loading}
                    onReload={() => actions.loadOwnReview(editing.id)}
                    onCancel={() => actions.setEditing(null)}
                    onSave={(input, base) => actions.mutate('PATCH', base ?? editing, input)}
                  />
                ) : undefined
              }
            />
          );
        })}
      </ul>
      {page?.hasMore && (
        <Button
          className={styles.spacedButton}
          loading={loading}
          loadingLabel="불러오는 중…"
          disabled={busy || Boolean(editing)}
          onClick={() => void load(true)}
        >
          더 보기
        </Button>
      )}
    </section>
  );
}
