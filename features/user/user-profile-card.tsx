'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { SettingsIcon, UserIcon } from '@/components/ui/icons';
import TierBadge from '@/features/grade/tier-badge';
import TierRing from '@/features/grade/tier-ring';
import type useUserGrade from '@/features/grade/use-user-grade';
import type { LocalIdentity } from '@/features/local-user/local-user-store';
import UserName from '@/features/local-user/user-name';
import styles from './user.module.css';

type Props = {
  identity: LocalIdentity | null;
  identityReady: boolean;
  grade: ReturnType<typeof useUserGrade>;
  reviewTotal: number | undefined;
  favoriteCount: number;
  onShowTiers: () => void;
  /** Five clicks on the card within two seconds (a hidden shortcut) open the identity editor;
   * clicks are not counted while `secretEditLocked`. */
  onSecretEdit: () => void;
  secretEditLocked: boolean;
};

/** The profile card: grade crest, nickname and counts, with the admin link beside it. */
export default function UserProfileCard({
  identity,
  identityReady,
  grade,
  reviewTotal,
  favoriteCount,
  onShowTiers,
  onSecretEdit,
  secretEditLocked,
}: Props) {
  const profileClicks = useRef({ start: 0, count: 0 });
  function clickProfile() {
    if (secretEditLocked) return;
    const now = performance.now();
    const clicks = profileClicks.current;
    if (!clicks.count || now - clicks.start > 2000) {
      clicks.start = now;
      clicks.count = 0;
    }
    clicks.count++;
    if (clicks.count === 5) {
      clicks.count = 0;
      onSecretEdit();
    }
  }
  return (
    <div className={styles.userProfileWrap}>
      <section
        className={styles.userProfile}
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
        {grade.tier ? (
          // The grade crest opens the tier table; it never counts toward the card's 5-click shortcut.
          <button
            type="button"
            className={styles.userAvatar}
            aria-label="등급표 보기"
            title="등급표 보기"
            onClick={(event) => {
              event.stopPropagation();
              onShowTiers();
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <TierRing tier={grade.tier} progress={grade.progress} />
          </button>
        ) : (
          <span className={styles.userAvatar} aria-hidden="true">
            <UserIcon size={30} strokeWidth="1.7" />
          </span>
        )}
        <div>
          {grade.tier && <TierBadge tier={grade.tier} />}
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
            작성한 리뷰 {reviewTotal ?? '—'} · 즐겨찾기 {identityReady ? favoriteCount : '—'}
          </p>
        </div>
      </section>
      {/* A sibling, not a child, so the card's 5-click editor shortcut ignores it. */}
      <Link
        href="/admin"
        className={styles.userAdminLink}
        aria-label="리스트 관리"
        title="리스트 관리"
      >
        <SettingsIcon size={16} />
      </Link>
    </div>
  );
}
