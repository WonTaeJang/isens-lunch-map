'use client';

import { CloseIcon } from '@/components/ui/icons';

import { useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/ui/button';
import ReviewCountBadges from '@/features/reviews/review-counts';
import ReviewedBadge from '@/features/reviews/reviewed-badge';
import FavoriteButton from '@/features/favorites/favorite-button';
import TodayLunchButton from '@/features/lunch-visits/today-lunch-button';
import useTodayLunchAction from '@/features/lunch-visits/use-today-lunch-action';
import type { ReviewCounts } from '@/lib/reviews/model';
import { hasCoordinates } from '@/lib/coordinates';
import { formatDistance } from '@/lib/distance';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { filterRestaurants, type RestaurantFilters } from './filter-restaurants';
import { DistanceFilter, FavoritesFilter } from './restaurant-filter-controls';
import RestaurantSlot, { createSlotNames } from './restaurant-slot';
import { getReviewCounts } from '@/lib/reviews/model';
import { pickRestaurant } from './random-model';
import styles from './random-restaurant.module.css';

export default function RandomRestaurant({
  restaurants,
  initialFilters,
  favorites,
  reviewCounts,
  reviewedIds,
  onClose,
  onSelect,
}: {
  restaurants: MapRestaurant[];
  initialFilters: RestaurantFilters;
  favorites: ReadonlySet<string>;
  reviewCounts: ReviewCounts | null;
  reviewedIds: ReadonlySet<string> | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const drawing = useRef(false);
  const [filters, setFilters] = useState({ ...initialFilters, query: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MapRestaurant | null>(null);
  const [reel, setReel] = useState<{ names: string[]; key: number; chosen: MapRestaurant } | null>(
    null,
  );
  const candidates = filterRestaurants(restaurants, filters, favorites);
  const resultCounts = result ? getReviewCounts(reviewCounts, result.id) : null;
  const todayLunch = useTodayLunchAction();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);

  function changeFilters(next: Partial<RestaurantFilters>) {
    setFilters((current) => ({ ...current, ...next, query: '' }));
    setResult(null);
    setReel(null);
  }
  function draw() {
    if (drawing.current) return;
    const chosen = pickRestaurant(candidates, result?.id);
    if (!chosen) return;
    if (candidates.length === 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReel(null);
      setResult(chosen);
      return;
    }
    const names = createSlotNames(candidates, chosen);
    drawing.current = true;
    setBusy(true);
    setResult(null);
    setReel((current) => ({ names, chosen, key: (current?.key ?? 0) + 1 }));
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.heading}>
        <h2 id={titleId}>오늘 뭐 먹지?</h2>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="랜덤 추천 닫기"
        >
          <CloseIcon size={20} />
        </button>
      </div>
      <p className="subtle">오늘의 점심을 골라드려요.</p>
      <fieldset className={styles.filters} disabled={busy}>
        <legend>거리 조건</legend>
        <DistanceFilter
          className={styles.chips}
          value={filters.maxDistance}
          onChange={(maxDistance) => changeFilters({ maxDistance })}
        />
        <div className={styles.heading}>
          <FavoritesFilter
            selected={filters.favoritesOnly}
            onChange={(favoritesOnly) => changeFilters({ favoritesOnly })}
          />
          <span className="subtle">후보 {candidates.length}곳</span>
        </div>
      </fieldset>
      {candidates.length ? (
        <>
          <RestaurantSlot
            reel={reel}
            placeholder={result?.name ?? '오늘의 점심은?'}
            onComplete={() => {
              if (!reel || !drawing.current) return;
              drawing.current = false;
              setBusy(false);
              setResult(reel.chosen);
            }}
          />
          <div
            className={styles.result}
            data-selected={!!result || undefined}
            role="status"
            aria-live="polite"
          >
            {busy ? (
              '맛있는 한 끼를 고르고 있어요…'
            ) : result ? (
              <>
                {/* 식당명 ✓ … 추천 비추천 / [거리] 카테고리 · 대표메뉴 … [즐겨찾기][오늘의 점심] */}
                <div className={styles.resultTitle}>
                  <strong>{result.name}</strong>
                  {reviewedIds?.has(result.id) && <ReviewedBadge />}
                  <div className={styles.resultCounts}>
                    <ReviewCountBadges colored counts={resultCounts} />
                  </div>
                </div>
                <div className={styles.resultMeta}>
                  <span className="distance-badge">{formatDistance(result.distance)}</span>
                  <span className={styles.resultMenu}>
                    {[result.category, result.main_menu].filter(Boolean).join(' · ') ||
                      '분류 정보 없음'}
                  </span>
                  <div className={styles.resultActions}>
                    <FavoriteButton
                      restaurantId={result.id}
                      restaurantName={result.name}
                      size="large"
                    />
                    <TodayLunchButton
                      restaurantName={result.name}
                      active={todayLunch.visit?.restaurant_id === result.id}
                      busy={todayLunch.busy}
                      size="large"
                      onToggle={() => todayLunch.request(result)}
                    />
                  </div>
                </div>
                {candidates.length === 1 && (
                  <p className="subtle">조건에 맞는 식당이 한 곳이에요.</p>
                )}
              </>
            ) : (
              '뽑기 버튼을 눌러보세요.'
            )}
          </div>
          <div className={styles.actions}>
            <Button variant={result ? 'secondary' : 'primary'} disabled={busy} onClick={draw}>
              {busy ? '고르는 중…' : result ? '다시 뽑기' : '식당 뽑기'}
            </Button>
            {result && (
              <Button disabled={!hasCoordinates(result)} onClick={() => onSelect(result.id)}>
                {hasCoordinates(result) ? '지도에서 보기' : '위치 정보 없음'}
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className={styles.empty} role="status">
          <p>
            {filters.favoritesOnly
              ? '조건에 맞는 즐겨찾기 식당이 없어요.'
              : '조건에 맞는 식당이 없어요.'}
          </p>
          <Button
            variant="secondary"
            onClick={() => changeFilters({ maxDistance: null, favoritesOnly: false })}
          >
            필터 초기화
          </Button>
        </div>
      )}
      {todayLunch.dialog}
    </dialog>
  );
}
