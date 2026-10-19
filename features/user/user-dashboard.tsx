'use client';
import styles from './user.module.css';

import { useState, type ReactNode } from 'react';
import LoadingStatus from '@/components/ui/loading-status';
import PromotionDialog from '@/features/grade/promotion-dialog';
import TierDialog from '@/features/grade/tier-dialog';
import useUserGrade from '@/features/grade/use-user-grade';
import useFavorites from '@/features/favorites/use-favorites';
import ReviewDeleteDialog from '@/features/reviews/review-delete-dialog';
import useReviewActions from '@/features/reviews/use-review-actions';
import useReviewFeed from '@/features/reviews/use-review-feed';
import type { UserReview, UserReviewPage } from '@/lib/reviews/model';
import type { RestaurantRow } from '@/lib/restaurant-types';
import { withEul } from '@/lib/korean';
import useLocalUser from '@/features/local-user/use-local-user';
import type { LocalIdentity } from '@/features/local-user/local-user-store';
import useBlacklist from '@/features/blacklist/use-blacklist';
import BlacklistList from '@/features/blacklist/blacklist-list';
import LunchCalendar from '@/features/lunch-visits/lunch-calendar';
import DeviceLinkDialog from './device-link-dialog';
import IdentityEditor from './identity-editor';
import IdentityImport from './identity-import';
import UserFavoritesTab from './user-favorites-tab';
import UserProfileCard from './user-profile-card';
import UserProgress from './user-progress';
import UserReviewsTab from './user-reviews-tab';

type Props = { restaurants: RestaurantRow[] };
const TABS = [
  { value: 'lunch', label: '점심 기록' },
  { value: 'reviews', label: '내 리뷰' },
  { value: 'favorites', label: '즐겨찾기' },
  { value: 'hidden', label: '숨긴 식당' },
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

/**
 * The user page: profile, progress and the storage note on the side, record tabs in the main
 * column. The review feed lives here because the profile counts, the grade and the 내 리뷰 tab
 * all read it, and the tabs stay locked while a review is being saved or edited.
 */
function UserDashboardContent({
  restaurants,
  identity,
  identityReady,
  identityError,
}: Props & { identity: LocalIdentity | null; identityReady: boolean; identityError: string }) {
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('lunch');
  const favorites = useFavorites();
  const hidden = useBlacklist().ids;
  /** A tab that needs the browser's identity: its content, an identity error or a loading line. */
  function withIdentity(what: string, render: (userId: string) => ReactNode) {
    if (identity) return render(identity.user_id);
    if (!identityReady) return <LoadingStatus label={`${withEul(what)} 불러오는 중…`} />;
    return (
      <p className="error-text" role="alert">
        {identityError || `사용자 정보를 확인할 수 없어 ${withEul(what)} 불러오지 못했어요.`}
      </p>
    );
  }
  const feed = useReviewFeed<UserReviewPage>(
    identity
      ? `/api/reviews?${new URLSearchParams({ scope: 'mine', user_id: identity.user_id })}`
      : null,
  );
  const { page, busy, load } = feed;
  const grade = useUserGrade(identity?.user_id ?? null, page);
  const loading = !identityReady || feed.loading;
  const actions = useReviewActions<UserReview>({
    identity,
    feed,
    savedNotice: '리뷰를 수정했어요.',
  });
  const { editing, deleting } = actions;
  const error = identityError || actions.error;
  return (
    <div className={styles.userDashboard}>
      {/* Wide screens: profile, progress and the storage note on the left, the record tabs on the right. */}
      <div className={styles.userSide}>
        <UserProfileCard
          identity={identity}
          identityReady={identityReady}
          grade={grade}
          reviewTotal={page?.total}
          favoriteCount={favorites.size}
          onShowTiers={() => setTierDialogOpen(true)}
          onSecretEdit={() => setIdentityEditorOpen(true)}
          secretEditLocked={!identity || busy || Boolean(editing)}
        />
        {identity && (
          <div className={styles.userDeviceLink}>
            <button type="button" onClick={() => setDeviceDialogOpen(true)}>
              다른 기기에서 이어 쓰기
            </button>
          </div>
        )}
        <UserProgress stats={page} loading={loading} />
        <p className={styles.userStorageNote}>
          이 브라우저에 저장된 사용자 정보예요. 브라우저 데이터를 삭제하면 기존 리뷰를 관리할 수
          없어요.
        </p>
      </div>
      {grade.promotion && (
        <PromotionDialog
          from={grade.promotion.from}
          to={grade.promotion.to}
          onClose={grade.dismissPromotion}
          onShowTiers={() => {
            grade.dismissPromotion();
            setTierDialogOpen(true);
          }}
        />
      )}
      {tierDialogOpen && grade.tier && (
        <TierDialog
          tier={grade.tier}
          score={grade.score}
          onClose={() => setTierDialogOpen(false)}
        />
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
      <div className={styles.userMain}>
        <div className={styles.userTabs} aria-label="내 기록 분류">
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
          <div className={styles.userRecords}>
            {withIdentity('점심 기록', (userId) => (
              <LunchCalendar userId={userId} />
            ))}
          </div>
        ) : tab === 'reviews' ? (
          <UserReviewsTab
            identity={identity}
            page={page}
            loading={loading}
            busy={busy}
            error={error}
            load={load}
            actions={actions}
            hidden={hidden}
          />
        ) : tab === 'hidden' ? (
          <section className={styles.userRecords} aria-label="숨긴 식당">
            {withIdentity('숨긴 식당', (userId) => (
              <BlacklistList
                userId={userId}
                listClassName={styles.userList}
                itemClassName={styles.userItem}
                inactiveClassName={styles.userRestaurantInactive}
              />
            ))}
          </section>
        ) : (
          <UserFavoritesTab restaurants={restaurants} favorites={favorites} />
        )}
      </div>
    </div>
  );
}
