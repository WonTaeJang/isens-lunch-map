'use client';
import { addressLabel, menuLine } from '@/lib/restaurant-labels';
import FavoriteToggle from '@/features/favorites/favorite-toggle';
import TodayLunchButton from '@/features/lunch-visits/today-lunch-button';
import ReviewedBadge from '@/features/reviews/reviewed-badge';
import RecommendationVote from '@/features/reviews/recommendation-vote';
import type { ReviewCounts } from '@/lib/reviews/model';
import DistanceBadge from './distance-badge';
import styles from './restaurant-list-item.module.css';
import { hasCoordinates } from '@/lib/coordinates';
import type { MapRestaurant } from '@/lib/restaurant-types';

/**
 * 식당명
 * [거리] 카테고리 · 대표메뉴            추천 비추천
 * 주소
 * [즐겨찾기][오늘의 점심]                  리뷰 보기
 */
export default function RestaurantListItem({
  reviewed,
  counts,
  mine,
  row,
  selected,
  favorite,
  todayLunch,
  todayLunchBusy,
  onSelect,
  onFavorite,
  onReviews,
  onTodayLunch,
}: {
  reviewed: boolean;
  counts: ReviewCounts[string] | null;
  /** The viewer's own 추천(true)/비추천(false), shown filled. */
  mine: boolean | null;
  row: MapRestaurant;
  selected: boolean;
  favorite: boolean;
  /** This restaurant is today's lunch. */
  todayLunch: boolean;
  todayLunchBusy: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onReviews: () => void;
  onTodayLunch: () => Promise<{ chosen: boolean }>;
}) {
  return (
    <li
      className={styles.item}
      data-restaurant-id={row.id}
      data-today-lunch={todayLunch || undefined}
    >
      <div className={styles.content} data-selected={selected || undefined}>
        <button
          type="button"
          className={styles.target}
          disabled={!hasCoordinates(row)}
          aria-label={`${row.name} 지도에서 보기`}
          aria-pressed={selected}
          onClick={onSelect}
        />
        <div className={styles.name}>
          <h3>{row.name}</h3>
          {reviewed && <ReviewedBadge />}
        </div>
        <div className={styles.meta}>
          <DistanceBadge distance={row.distance} />
          <span className={styles.menu}>{menuLine(row)}</span>
          <RecommendationVote
            restaurantId={row.id}
            counts={counts}
            initialChoice={mine}
            lazy
            className={styles.vote}
          />
        </div>
        <p className={styles.address}>{addressLabel(row.address)}</p>
        {!hasCoordinates(row) && (
          <span className={`subtle ${styles.noCoords}`}>
            위치 정보 없음 · 지도에 표시되지 않아요
          </span>
        )}
      </div>
      <div className={styles.footer}>
        <div className={styles.actions}>
          <FavoriteToggle restaurantName={row.name} selected={favorite} onClick={onFavorite} />
          <TodayLunchButton
            restaurantName={row.name}
            active={todayLunch}
            busy={todayLunchBusy}
            onToggle={onTodayLunch}
          />
        </div>
        <button
          type="button"
          className={styles.reviewButton}
          aria-label={`${row.name} 리뷰 보기`}
          onClick={onReviews}
        >
          리뷰 보기
        </button>
      </div>
    </li>
  );
}
