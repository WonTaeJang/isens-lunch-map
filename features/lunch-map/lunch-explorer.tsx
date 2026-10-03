'use client';

import { DiceIcon } from '@/components/ui/icons';

import { useMemo, useRef, useState } from 'react';
import type { ReviewCounts } from '@/lib/reviews/model';
import useReviewedRestaurants from '@/features/reviews/use-reviewed-restaurants';
import ReviewPanel from '@/features/reviews/review-panel';
import CountBadge from '@/components/ui/count-badge';
import RandomRestaurant from './random-restaurant';
import RestaurantFilters from './restaurant-filters';
import RestaurantResults from './restaurant-results';
import LunchMap from './lunch-map';
import useFavorites from '@/features/favorites/use-favorites';
import { toggleStoredFavorite } from '@/features/favorites/favorites-store';
import { DEFAULT_FILTERS, filterRestaurants } from './filter-restaurants';
import type { MapRestaurant } from '@/lib/restaurant-types';

export default function LunchExplorer({
  restaurants,
  reviewCounts,
  initialRestaurantId = null,
}: {
  initialRestaurantId?: string | null;
  reviewCounts: ReviewCounts | null;
  restaurants: MapRestaurant[];
}) {
  const reviewedIds = useReviewedRestaurants(reviewCounts);
  const [reviewRestaurant, setReviewRestaurant] = useState<MapRestaurant | null>(null);
  function openReviews(id: string) {
    setReviewRestaurant(restaurants.find((row) => row.id === id) ?? null);
  }
  const layoutRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialRestaurantId);
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(() =>
    initialRestaurantId ? { id: initialRestaurantId } : null,
  );
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [randomOpen, setRandomOpen] = useState(false);
  const favorites = useFavorites();
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const rows = useMemo(
    () => filterRestaurants(restaurants, filters, favorites),
    [restaurants, filters, favorites],
  );
  // Hidden selections must not reopen when a filter is removed.
  const visibleSelectedId = rows.some((row) => row.id === selectedId) ? selectedId : null;
  if (selectedId !== visibleSelectedId) setSelectedId(visibleSelectedId);

  function changeFilters(next: Partial<typeof filters>) {
    setFilters((current) => ({ ...current, ...next }));
    setFocusRequest(null);
    setSelectedId(null);
  }
  function resetFilters() {
    changeFilters(DEFAULT_FILTERS);
  }
  function selectFromList(id: string) {
    setSelectedId(id);
    setFocusRequest({ id });
    if (window.matchMedia('(max-width: 760px)').matches)
      layoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function favoriteFromList(id: string) {
    setFavoriteError(toggleStoredFavorite(id));
  }

  return (
    <div ref={layoutRef} className="map-layout" id="lunch-map-layout">
      <aside className="restaurant-panel" aria-label="식당 목록">
        <div className="panel-heading">
          <h2>
            점심 리스트 <CountBadge>{rows.length}</CountBadge>
          </h2>
          <div className="panel-heading-actions">
            <button
              className="random-pick-button"
              type="button"
              disabled={!restaurants.length}
              onClick={() => setRandomOpen(true)}
            >
              <DiceIcon size={16} />
              랜덤 추천
            </button>
          </div>
        </div>
        {favoriteError && (
          <p className="favorite-error" role="alert">
            {favoriteError}
          </p>
        )}
        <RestaurantFilters
          {...filters}
          onQueryChange={(query) => changeFilters({ query })}
          onDistanceChange={(maxDistance) => changeFilters({ maxDistance })}
          onFavoritesOnlyChange={(favoritesOnly) => changeFilters({ favoritesOnly })}
        />
        <RestaurantResults
          reviewedIds={reviewedIds}
          reviewCounts={reviewCounts}
          rows={rows}
          total={restaurants.length}
          favoritesOnly={filters.favoritesOnly}
          favorites={favorites}
          selectedId={visibleSelectedId}
          onSelect={selectFromList}
          onFavorite={favoriteFromList}
          onReset={resetFilters}
          onReviews={openReviews}
        />
        <div className="panel-note">
          <span aria-hidden="true">ⓘ</span>
          <p>
            식당이 등록되면 지도와 리스트에서
            <br />
            함께 확인할 수 있어요.
          </p>
        </div>
      </aside>
      <LunchMap
        reviewedIds={reviewedIds}
        reviewCounts={reviewCounts}
        restaurants={rows}
        favorites={favorites}
        selectedId={visibleSelectedId}
        focusRequest={focusRequest}
        onSelect={setSelectedId}
        onFavorite={toggleStoredFavorite}
        onReviews={openReviews}
      />
      {reviewRestaurant && (
        <ReviewPanel
          key={reviewRestaurant.id}
          restaurant={reviewRestaurant}
          onClose={() => setReviewRestaurant(null)}
        />
      )}
      {randomOpen && (
        <RandomRestaurant
          restaurants={restaurants}
          reviewedIds={reviewedIds}
          reviewCounts={reviewCounts}
          initialFilters={filters}
          favorites={favorites}
          onClose={() => setRandomOpen(false)}
          onSelect={(id) => {
            setRandomOpen(false);
            setFilters(DEFAULT_FILTERS);
            selectFromList(id);
          }}
        />
      )}
    </div>
  );
}
