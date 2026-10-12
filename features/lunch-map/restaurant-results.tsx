import { getReviewCounts } from '@/lib/reviews/model';
import type { ReviewCounts } from '@/lib/reviews/model';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import Button from '@/components/ui/button';
import EmptyState from '@/components/ui/empty-state';
import RestaurantListItem from './restaurant-list-item';
import styles from './restaurant-results.module.css';
import useTodayLunchAction from '@/features/lunch-visits/use-today-lunch-action';
import type { MapRestaurant } from '@/lib/restaurant-types';

type Props = {
  /** Restaurants the viewer reviewed, with their 추천(true)/비추천(false)/none(null). */
  ownReviews: ReadonlyMap<string, boolean | null> | null;
  reviewCounts: ReviewCounts | null;
  rows: MapRestaurant[];
  total: number;
  favoritesOnly: boolean;
  favorites: ReadonlySet<string>;
  selectedId: string | null;
  /** The map's focus request: the list also scrolls to that restaurant when it is out of view. */
  focusRequest: { id: string } | null;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onReviews: (id: string) => void;
  onReset: () => void;
};

export default function RestaurantResults({
  ownReviews,
  reviewCounts,
  rows,
  total,
  favoritesOnly,
  favorites,
  selectedId,
  focusRequest,
  onSelect,
  onFavorite,
  onReviews,
  onReset,
}: Props) {
  const todayLunch = useTodayLunchAction();
  const list = useRef<HTMLUListElement>(null);
  // Only the list's own scroll area moves (the page is left alone), and only when the row is
  // not already fully visible, so picking a row on screen does not shift the list.
  useEffect(() => {
    const box = list.current;
    const item =
      focusRequest && box?.querySelector(`[data-restaurant-id="${CSS.escape(focusRequest.id)}"]`);
    if (!box || !item) return;
    const view = box.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    if (rect.top < view.top || rect.bottom > view.bottom) box.scrollTop += rect.top - view.top;
  }, [focusRequest]);
  if (!total)
    return (
      <EmptyState
        icon="⌖"
        title="활성 식당이 없어요"
        description="관리자 페이지에서 식당 목록을 등록해 주세요."
        action={
          <Link href="/admin" className="text-link">
            리스트 관리로 이동 ↗
          </Link>
        }
      />
    );
  if (!rows.length)
    return (
      <EmptyState
        title={favoritesOnly ? '조건에 맞는 즐겨찾기 식당이 없어요' : '조건에 맞는 식당이 없어요'}
        description={
          favoritesOnly
            ? '즐겨찾기를 추가하거나 필터를 변경해 보세요.'
            : '검색어나 거리 필터를 변경해 보세요.'
        }
        action={<Button onClick={onReset}>필터 초기화</Button>}
      />
    );
  return (
    <>
      <ul ref={list} className={styles.list}>
        {rows.map((row) => (
          <RestaurantListItem
            reviewed={ownReviews?.has(row.id) ?? false}
            counts={getReviewCounts(reviewCounts, row.id)}
            mine={ownReviews?.get(row.id) ?? null}
            key={row.id}
            row={row}
            favorite={favorites.has(row.id)}
            selected={selectedId === row.id}
            onFavorite={() => onFavorite(row.id)}
            onSelect={() => onSelect(row.id)}
            onReviews={() => onReviews(row.id)}
            todayLunch={todayLunch.visit?.restaurant_id === row.id}
            todayLunchBusy={todayLunch.busy}
            onTodayLunch={() => todayLunch.request(row)}
          />
        ))}
      </ul>
      {todayLunch.dialog}
    </>
  );
}
