'use client';

import { addressLabel, categoryLabel } from '@/lib/restaurant-labels';
import { CheckIcon, ChevronLeftIcon, DirectionsIcon } from '@/components/ui/icons';
import FavoriteToggle from '@/features/favorites/favorite-toggle';
import HideButton from '@/features/blacklist/hide-button';
import TodayLunchButton from '@/features/lunch-visits/today-lunch-button';
import useVoteState from '@/features/reviews/use-vote-state';
import RecommendationVote from '@/features/reviews/recommendation-vote';
import type { ReviewCounts } from '@/lib/reviews/model';
import { useState } from 'react';
import type { MapRestaurant } from '@/lib/restaurant-types';
import DistanceBadge from './distance-badge';
import styles from './restaurant-map-card.module.css';

type Props = {
  reviewed: boolean;
  restaurant: MapRestaurant;
  counts: ReviewCounts[string] | null;
  favorite: boolean;
  /** This restaurant is today's lunch. */
  todayLunch: boolean;
  todayLunchBusy: boolean;
  onReviews: () => void;
  onClose: () => void;
  onFavorite: () => string | null;
  /** Records, changes (after confirmation) or cancels today's lunch and shows the result in a
   * snackbar. `chosen` is true only when this restaurant just became today's lunch. */
  onTodayLunch: () => Promise<{ chosen: boolean }>;
  /** Shown when other restaurants share this place: returns to their list. `label` names the
   * list for screen readers; the button reads 이전으로. */
  back?: { label: string; onClick: () => void };
};

export default function RestaurantMapCard({
  reviewed,
  counts,
  restaurant,
  favorite,
  todayLunch,
  todayLunchBusy,
  onClose,
  onFavorite,
  onReviews,
  onTodayLunch,
  back,
}: Props) {
  const { busy: voteBusy } = useVoteState(restaurant.id);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <article
      className={styles.card}
      aria-label={`${restaurant.name} 상세 정보`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <button type="button" className={styles.close} aria-label="상세 정보 닫기" onClick={onClose}>
        ×
      </button>
      <div inert={voteBusy} aria-busy={voteBusy || undefined}>
        {back && (
          <button
            type="button"
            className={styles.back}
            aria-label={back.label}
            onClick={back.onClick}
          >
            <ChevronLeftIcon size={16} />
            이전으로
          </button>
        )}
        <div className={styles.header}>
          <h3>{restaurant.name}</h3>
        </div>
        <div className={styles.meta}>
          {categoryLabel(restaurant.category)}
          <DistanceBadge distance={restaurant.distance} />
          <RecommendationVote
            restaurantId={restaurant.id}
            counts={counts}
            className={styles.vote}
          />
        </div>
        <div className={styles.details}>
          <p>{addressLabel(restaurant.address)}</p>
          <p className={styles.menu}>대표메뉴 · {restaurant.main_menu || '정보 없음'}</p>
        </div>
        <div className={styles.actions}>
          <FavoriteToggle
            restaurantName={restaurant.name}
            selected={favorite}
            onClick={() => setMessage(onFavorite())}
          />
          <HideButton
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            favorite={favorite}
            todayLunch={todayLunch}
          />
          <TodayLunchButton
            restaurantName={restaurant.name}
            active={todayLunch}
            busy={todayLunchBusy}
            onToggle={onTodayLunch}
          />
          {/* The viewer's review mark lives here rather than beside the name, so names keep to one line. */}
          <button
            type="button"
            className={styles.review}
            data-reviewed={reviewed || undefined}
            aria-label={`${restaurant.name} 리뷰 보기${reviewed ? ', 내 리뷰 작성됨' : ''}`}
            title={reviewed ? '내 리뷰 작성됨' : undefined}
            onClick={onReviews}
          >
            리뷰
            {reviewed && <CheckIcon size={14} />}
          </button>
          <a
            className={`${styles.directions} ${styles.icon}`}
            aria-label={`${restaurant.name} 길찾기 (새 탭)`}
            title="길찾기"
            href={`https://map.kakao.com/link/to/${encodeURIComponent(restaurant.name)},${Number(restaurant.latitude)},${Number(restaurant.longitude)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DirectionsIcon size={20} />
          </a>
        </div>
        <p className={styles.status} role="status">
          {message}
        </p>
      </div>
      {voteBusy && <div className={styles.saving} aria-hidden="true" />}
    </article>
  );
}
