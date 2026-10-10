'use client';
import styles from './user.module.css';

import IdentityEditor from './identity-editor';
import UserProgress from './user-progress';
import Link from 'next/link';
import { useRef, useState } from 'react';
import Button from '@/components/ui/button';
import { SettingsIcon, UserIcon } from '@/components/ui/icons';
import LoadingStatus from '@/components/ui/loading-status';
import FavoriteToggle from '@/features/favorites/favorite-toggle';
import useFavorites from '@/features/favorites/use-favorites';
import { toggleStoredFavorite } from '@/features/favorites/favorites-store';
import ReviewActionIcons from '@/features/reviews/review-action-icons';
import RecommendationBadge from '@/features/reviews/recommendation-badge';
import ReviewForm from '@/features/reviews/review-form';
import ReviewFooter from '@/features/reviews/review-footer';
import ReviewDeleteDialog from '@/features/reviews/review-delete-dialog';
import useReviewActions from '@/features/reviews/use-review-actions';
import { reviewTimestamp, type UserReview, type UserReviewPage } from '@/lib/reviews/model';
import type { RestaurantRow } from '@/lib/restaurant-types';
import { hasCoordinates } from '@/lib/coordinates';
import { restaurantMapHref } from '@/lib/map-link';
import { formatDistance } from '@/lib/distance';

import useLocalUser from '@/features/local-user/use-local-user';
import UserName from '@/features/local-user/user-name';
import type { LocalIdentity } from '@/features/local-user/local-user-store';
import useReviewFeed from '@/features/reviews/use-review-feed';
import LunchCalendar from '@/features/lunch-visits/lunch-calendar';
import DeviceLinkDialog from './device-link-dialog';
import IdentityImport from './identity-import';
type Props = { restaurants: RestaurantRow[] };
const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const TABS = [
  { value: 'lunch', label: '점심 기록' },
  { value: 'reviews', label: '내 리뷰' },
  { value: 'favorites', label: '즐겨찾기' },
] as const;

export default function UserDashboard(props: Props) {
  const user = useLocalUser();
  return (
    <>
      <UserDashboardContent
        key={user.identity?.user_id ?? String(user.ready)}
        {...props}
        identity={user.identity}
        identityReady={user.ready}
        identityError={user.error}
      />
      <IdentityImport identity={user.identity} ready={user.ready} />
    </>
  );
}
function UserDashboardContent({
  restaurants,
  identity,
  identityReady,
  identityError,
}: Props & { identity: LocalIdentity | null; identityReady: boolean; identityError: string }) {
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const profileClicks = useRef({ start: 0, count: 0 });
  function clickProfile() {
    if (!identity || busy || editing) return;
    const now = performance.now();
    const clicks = profileClicks.current;
    if (!clicks.count || now - clicks.start > 2000) {
      clicks.start = now;
      clicks.count = 0;
    }
    clicks.count++;
    if (clicks.count === 5) {
      clicks.count = 0;
      setIdentityEditorOpen(true);
    }
  }
  const favorites = useFavorites();
  const feed = useReviewFeed<UserReviewPage>(
    identity
      ? `/api/reviews?${new URLSearchParams({ scope: 'mine', user_id: identity.user_id })}`
      : null,
  );
  const { page, busy, load } = feed;
  const loading = !identityReady || feed.loading;
  const actions = useReviewActions<UserReview>({
    identity,
    feed,
    savedNotice: '리뷰를 수정했어요.',
  });
  const { notice, editing, deleting, setError } = actions;
  const error = identityError || actions.error;
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('lunch');
  const [favoriteError, setFavoriteError] = useState('');
  const savedRestaurants = restaurants
    .filter((row) => favorites.has(row.id))
    .sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)));
  return (
    <div className={styles['user-dashboard']}>
      <div className={styles['user-profile-wrap']}>
        <section
          className={styles['user-profile']}
          aria-label="내 프로필"
          tabIndex={0}
          onClick={clickProfile}
          onKeyDown={(event) => {
            if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              clickProfile();
            }
          }}
        >
          <span className={styles['user-avatar']} aria-hidden="true">
            <UserIcon size={30} strokeWidth="1.7" />
          </span>
          <div>
            <p className="subtle">나의 점심 기록</p>
            <h1>
              {identity ? (
                <UserName name={identity.user_name} />
              ) : identityReady ? (
                '사용자 정보를 확인해 주세요'
              ) : (
                '불러오는 중…'
              )}
            </h1>
            <p className="subtle">
              작성한 리뷰 {page?.total ?? '—'} · 즐겨찾기 {identityReady ? favorites.size : '—'}
            </p>
          </div>
        </section>
        {/* A sibling, not a child, so the card's 5-click editor shortcut ignores it. */}
        <Link
          href="/admin"
          className={styles['user-admin-link']}
          aria-label="리스트 관리"
          title="리스트 관리"
        >
          <SettingsIcon size={16} />
        </Link>
      </div>
      {identity && (
        <div className={styles['user-device-link']}>
          <button type="button" onClick={() => setDeviceDialogOpen(true)}>
            다른 기기에서 이어 쓰기
          </button>
        </div>
      )}
      {deviceDialogOpen && identity && (
        <DeviceLinkDialog identity={identity} onClose={() => setDeviceDialogOpen(false)} />
      )}
      {identityEditorOpen && identity && (
        <IdentityEditor identity={identity} onClose={() => setIdentityEditorOpen(false)} />
      )}
      {deleting && (
        <ReviewDeleteDialog
          busy={busy}
          error={error}
          onCancel={actions.cancelDelete}
          onConfirm={actions.confirmDelete}
        />
      )}
      <UserProgress stats={page} loading={loading} />
      <div className={styles['user-tabs']} aria-label="내 기록 분류">
        {TABS.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-pressed={tab === item.value}
            disabled={busy || Boolean(editing)}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'lunch' ? (
        <div className={styles['user-records']}>
          {identity ? (
            <LunchCalendar userId={identity.user_id} />
          ) : identityReady ? (
            <p className="review-error" role="alert">
              {identityError || '사용자 정보를 확인할 수 없어 점심 기록을 불러오지 못했어요.'}
            </p>
          ) : (
            <LoadingStatus label="점심 기록을 불러오는 중…" />
          )}
        </div>
      ) : tab === 'reviews' ? (
        <section className={styles['user-records']} aria-label="내 리뷰">
          {error && (
            <div className="review-error" role="alert">
              {error}{' '}
              <Button
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
            <div className="review-empty">
              아직 작성한 리뷰가 없어요.{' '}
              <Link href="/" className="text-link">
                점심 지도에서 식당 찾아보기
              </Link>
            </div>
          )}
          <ul className="review-list">
            {page?.reviews.map((review) => (
              <li
                className={`review-item${review.restaurant_active ? '' : ` ${styles['user-restaurant-inactive']}`}`}
                key={review.id}
              >
                <div className="review-item-heading">
                  <h2>
                    {review.restaurant_active && hasCoordinates(review) ? (
                      <Link href={restaurantMapHref(review.restaurant_id)}>
                        {review.restaurant_name}
                      </Link>
                    ) : (
                      review.restaurant_name
                    )}
                  </h2>
                  <div className="review-heading-actions">
                    <RecommendationBadge recommended={review.is_recommended} />
                    <ReviewActionIcons
                      disabled={busy || loading || Boolean(editing)}
                      onEdit={() => actions.startEdit(review)}
                      onDelete={() => actions.startDelete(review)}
                    />
                  </div>
                </div>
                {!review.restaurant_active && <p className="subtle">현재 비활성 식당이에요.</p>}
                {review.restaurant_active && !hasCoordinates(review) && (
                  <p className="subtle">위치 정보 없음 · 지도에 표시되지 않아요</p>
                )}
                <p className="subtle">
                  {DATE_FORMAT.format(new Date(reviewTimestamp(review)))}
                  {review.updated_at && ' · 수정됨'}
                </p>
                {editing?.id === review.id ? (
                  <ReviewForm
                    key={editing.id}
                    review={editing}
                    busy={busy || loading}
                    onReload={() => actions.loadOwnReview(editing.id)}
                    onCancel={() => actions.setEditing(null)}
                    onSave={(input, base) => actions.mutate('PATCH', base ?? editing, input)}
                  />
                ) : (
                  <>
                    {review.content && <p className="review-content">{review.content}</p>}
                    <ReviewFooter review={review} />
                  </>
                )}
              </li>
            ))}
          </ul>
          {page?.hasMore && (
            <Button
              loading={loading}
              loadingLabel="불러오는 중…"
              disabled={busy || Boolean(editing)}
              onClick={() => void load(true)}
            >
              더 보기
            </Button>
          )}
        </section>
      ) : (
        <section className={styles['user-records']} aria-label="즐겨찾기 식당">
          {favoriteError && (
            <p className="review-error" role="alert">
              {favoriteError}
            </p>
          )}
          {!savedRestaurants.length && (
            <p className="review-empty">
              즐겨찾기한 식당이 없어요.{' '}
              <Link href="/" className="text-link">
                식당 찾아보기
              </Link>
            </p>
          )}
          <ul className="review-list">
            {savedRestaurants.map((row) => (
              <li
                className={`review-item${row.active ? '' : ` ${styles['user-restaurant-inactive']}`}`}
                key={row.id}
              >
                <div className="review-item-heading">
                  <div className={styles['favorite-title']}>
                    <FavoriteToggle
                      restaurantName={row.name}
                      selected={favorites.has(row.id)}
                      onClick={() => setFavoriteError(toggleStoredFavorite(row.id) ?? '')}
                    />
                    <h2>
                      {row.active && hasCoordinates(row) ? (
                        <Link href={restaurantMapHref(row.id)}>{row.name}</Link>
                      ) : (
                        row.name
                      )}
                    </h2>
                  </div>
                  <span className="distance-badge">{formatDistance(row.distance)}</span>
                </div>
                <p className="description">
                  {row.category} · {row.main_menu}
                </p>
                <p className="description">{row.address || '주소 확인 필요'}</p>
                {!row.active && <p className="subtle">현재 비활성 식당이에요.</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className={styles['user-storage-note']}>
        이 브라우저에 저장된 사용자 정보예요. 브라우저 데이터를 삭제하면 기존 리뷰를 관리할 수
        없어요.
      </p>
    </div>
  );
}
