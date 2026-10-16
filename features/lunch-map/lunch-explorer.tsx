'use client';

import { SlotIcon, GiftBoxIcon } from '@/components/ui/icons';
import dynamic from 'next/dynamic';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReviewCounts } from '@/lib/reviews/model';
import useOwnReviews from '@/features/reviews/use-own-reviews';
import ReviewPanel from '@/features/reviews/review-panel';
import CountBadge from '@/components/ui/count-badge';
import { showSnackbar } from '@/components/ui/snackbar';
import RandomRestaurant from './random-restaurant';
import RestaurantFilters from './restaurant-filters';
import RestaurantResults from './restaurant-results';
import styles from './lunch-explorer.module.css';
import LunchMap from './lunch-map';
import useFavorites from '@/features/favorites/use-favorites';
import useBlacklist from '@/features/blacklist/use-blacklist';
import { toggleStoredFavorite } from '@/features/favorites/favorites-store';
import { DEFAULT_FILTERS, filterRestaurants } from './filter-restaurants';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { LUNCH_MAP_ANCHOR } from '@/lib/map-link';

const LunchBoxGame = dynamic(() => import('@/features/lunch-box/lunch-box-game'), { ssr: false });

export default function LunchExplorer({
  restaurants: allRestaurants,
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
  // Hidden (blacklisted) restaurants leave the map, the list, search and the random pick.
  const hidden = useBlacklist().ids;
  const restaurants = useMemo(
    () => (hidden?.size ? allRestaurants.filter((row) => !hidden.has(row.id)) : allRestaurants),
    [allRestaurants, hidden],
  );
  // A shared or typed link to a hidden restaurant opens nothing; say why once, when the hidden
  // list first arrives (hiding the linked restaurant later shows its own undo message instead).
  const linkChecked = useRef(false);
  useEffect(() => {
    if (!hidden || linkChecked.current) return;
    linkChecked.current = true;
    if (initialRestaurantId && hidden.has(initialRestaurantId)) {
      showSnackbar('숨긴 식당이에요. 내 페이지의 숨긴 식당에서 다시 볼 수 있어요.');
    }
  }, [hidden, initialRestaurantId]);
  // Reloaded whenever the server counts refresh after a review change.
  const ownReviews = useOwnReviews(reviewCounts);
  const reviewedIds = ownReviews?.ids ?? null;
  const [reviewRestaurant, setReviewRestaurant] = useState<MapRestaurant | null>(() =>
    initialReviewsOpen ? (restaurants.find((row) => row.id === initialRestaurantId) ?? null) : null,
  );
  function openReviews(id: string) {
    setReviewRestaurant(restaurants.find((row) => row.id === id) ?? null);
  }
  const layoutRef = useRef<HTMLDivElement>(null);
  // A linked restaurant that is already known to be hidden is neither selected nor focused.
  const linkedId =
    initialRestaurantId && !hidden?.has(initialRestaurantId) ? initialRestaurantId : null;
  const [selectedId, setSelectedId] = useState<string | null>(linkedId);
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(() =>
    linkedId ? { id: linkedId } : null,
  );
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeGame, setActiveGame] = useState<'slot' | 'box' | null>(null);
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
  function selectRestaurant(id: string) {
    setSelectedId(id);
    setFocusRequest({ id });
    if (window.matchMedia('(max-width: 760px)').matches)
      layoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  /** A pick from the list: an active search is cleared (other filters stay) so the map and the
   * list show the restaurant among its neighbors. */
  function selectFromList(id: string) {
    if (filters.query) setFilters((current) => ({ ...current, query: '' }));
    selectRestaurant(id);
  }
  /** Selects a restaurant and shows it on the map, clearing the filters only if they hide it.
   * Returns false when the restaurant is not on the map at all (e.g. deactivated). */
  function showRestaurant(id: string) {
    if (!restaurants.some((row) => row.id === id)) return false;
    if (!rows.some((row) => row.id === id)) setFilters(DEFAULT_FILTERS);
    selectRestaurant(id);
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
    <div ref={layoutRef} className={styles.layout} id={LUNCH_MAP_ANCHOR}>
      <aside className={styles.panel} aria-label="식당 목록">
        <div className={styles.heading}>
          <h2>
            점심 리스트 <CountBadge className={styles.headingCount}>{rows.length}</CountBadge>
          </h2>
          <div className={styles.headingActions}>
            <button
              className={styles.randomPick}
              type="button"
              disabled={!restaurants.length}
              aria-label="슬롯 뽑기 게임 열기"
              title="슬롯 뽑기"
              aria-haspopup="dialog"
              onClick={() => setActiveGame('slot')}
            >
              <SlotIcon size={24} />
            </button>
            <button
              className={styles.randomPick}
              type="button"
              disabled={!restaurants.length}
              aria-label="점심 상자 게임 열기"
              title="점심 상자"
              aria-haspopup="dialog"
              onClick={() => setActiveGame('box')}
            >
              <GiftBoxIcon size={20} />
            </button>
          </div>
        </div>
        {favoriteError && (
          <p className={styles.favoriteError} role="alert">
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
          ownReviews={ownReviews?.choices ?? null}
          reviewCounts={reviewCounts}
          rows={rows}
          total={allRestaurants.length}
          favoritesOnly={filters.favoritesOnly}
          favorites={favorites}
          selectedId={visibleSelectedId}
          focusRequest={focusRequest}
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
        onRandom={() => setActiveGame(Math.random() < 0.5 ? 'slot' : 'box')}
        onShowTodayLunch={showTodayLunch}
      />
      {reviewRestaurant && !hidden?.has(reviewRestaurant.id) && (
        <ReviewPanel
          key={reviewRestaurant.id}
          restaurant={reviewRestaurant}
          onClose={() => setReviewRestaurant(null)}
        />
      )}
      {activeGame === 'box' && (
        <LunchBoxGame
          restaurants={restaurants}
          reviewCounts={reviewCounts}
          favorites={favorites}
          initialFilters={filters}
          onClose={() => setActiveGame(null)}
          onSelect={(id) => {
            setActiveGame(null);
            showRestaurant(id);
          }}
        />
      )}
      {activeGame === 'slot' && (
        <RandomRestaurant
          restaurants={restaurants}
          reviewedIds={reviewedIds}
          reviewCounts={reviewCounts}
          initialFilters={filters}
          favorites={favorites}
          onClose={() => setActiveGame(null)}
          onSelect={(id) => {
            setActiveGame(null);
            showRestaurant(id);
          }}
        />
      )}
    </div>
  );
}
