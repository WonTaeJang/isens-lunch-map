'use client';
import { BowlChopsticksIcon } from '@/components/ui/icons';
import FavoriteToggle from '@/features/favorites/favorite-toggle';
import TodayLunchButton from '@/features/lunch-visits/today-lunch-button';
import ReviewedBadge from '@/features/reviews/reviewed-badge';
import RecommendationVote from '@/features/reviews/recommendation-vote';
import type { ReviewCounts } from '@/lib/reviews/model';
import { formatDistance } from '@/lib/distance';
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
  const menu = [row.category, row.main_menu].filter(Boolean).join(' · ');
  return (
    <li className="restaurant-list-item" data-today-lunch={todayLunch || undefined}>
      <div className="restaurant-select-content" data-selected={selected || undefined}>
        <button
          type="button"
          className="restaurant-select-target"
          disabled={!hasCoordinates(row)}
          aria-label={`${row.name} 지도에서 보기`}
          aria-pressed={selected}
          onClick={onSelect}
        />
        <div className="restaurant-list-name">
          <h3>{row.name}</h3>
          {reviewed && <ReviewedBadge />}
          {todayLunch && (
            <span className="today-lunch-badge">
              <BowlChopsticksIcon size={12} strokeWidth="2.2" />
              오늘의 점심
            </span>
          )}
        </div>
        <div className="restaurant-list-meta">
          <span className="distance-badge">{formatDistance(row.distance)}</span>
          <span className="restaurant-list-menu">{menu || '분류 정보 없음'}</span>
          <RecommendationVote
            restaurantId={row.id}
            counts={counts}
            initialChoice={mine}
            lazy
            className="restaurant-list-vote"
          />
        </div>
        <p className="restaurant-list-address">{row.address || '주소 확인 필요'}</p>
        {!hasCoordinates(row) && (
          <span className="subtle">위치 정보 없음 · 지도에 표시되지 않아요</span>
        )}
      </div>
      <div className="restaurant-list-footer">
        <div className="restaurant-list-actions">
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
          className="restaurant-review-button"
          aria-label={`${row.name} 리뷰 보기`}
          onClick={onReviews}
        >
          리뷰 보기
        </button>
      </div>
    </li>
  );
}
