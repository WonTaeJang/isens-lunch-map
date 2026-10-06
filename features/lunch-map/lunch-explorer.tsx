'use client';

import { DiceIcon } from '@/components/ui/icons';

import { useMemo, useRef, useState } from 'react';
import type { ReviewCounts } from '@/lib/reviews/model';
import useReviewedRestaurants from '@/features/reviews/use-reviewed-restaurants';
import ReviewPanel from '@/features/reviews/review-panel';
import CountBadge from '@/components/ui/count-badge';
import { showSnackbar } from '@/components/ui/snackbar';
import RandomRestaurant from './random-restaurant';
import RestaurantFilters from './restaurant-filters';
import RestaurantResults from './restaurant-results';
import LunchMap from './lunch-map';
import useFavorites from '@/features/favorites/use-favorites';
import { toggleStoredFavorite } from '@/features/favorites/favorites-store';
import { DEFAULT_FILTERS, filterRestaurants } from './filter-restaurants';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { LUNCH_MAP_ANCHOR } from '@/lib/map-link';

export default function LunchExplorer({
  restaurants,
  reviewCounts,
  initialRestaurantId = null,
  initialReviewsOpen = false,
}: {
  initialRestaurantId?: string | null;
  /** Also opens the reviews of `initialRestaurantId` (links from the review rankings). */
  initialReviewsOpen?: boolean;
  reviewCounts: ReviewCounts | null;
  restaurants: MapRestaurant[];
}) {
  const reviewedIds = useReviewedRestaurants(reviewCounts);
  const [reviewRestaurant, setReviewRestaurant] = useState<MapRestaurant | null>(() =>
    initialReviewsOpen ? (restaurants.find((row) => row.id === initialRestaurantId) ?? null) : null,
  );
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
  /** Selects a restaurant and shows it on the map, clearing the filters only if they hide it.
   * Returns false when the restaurant is not on the map at all (e.g. deactivated). */
  function showRestaurant(id: string) {
    if (!restaurants.some((row) => row.id === id)) return false;
    if (!rows.some((row) => row.id === id)) setFilters(DEFAULT_FILTERS);
    selectFromList(id);
    return true;
  }
  function showTodayLunch(id: string) {
    if (!showRestaurant(id))
      showSnackbar('오늘의 점심 식당을 지도에서 찾을 수 없어요.', { tone: 'error' });
  }
  function favoriteFromList(id: string) {
    setFavoriteError(toggleStoredFavorite(id));
  }

  return (
    <div ref={layoutRef} className="map-layout" id={LUNCH_MAP_ANCHOR}>
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
        randomDisabled={!restaurants.length}
        onRandom={() => setRandomOpen(true)}
        onShowTodayLunch={showTodayLunch}
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
            showRestaurant(id);
          }}
        />
      )}
    </div>
  );
}
