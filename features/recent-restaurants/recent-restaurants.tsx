'use client';

import { useEffect, useRef, useState } from 'react';
import { CloseIcon, HistoryIcon } from '@/components/ui/icons';
import { showSnackbar } from '@/components/ui/snackbar';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { recentRestaurants, useRecentRestaurantIds } from './recent-restaurants-store';
import styles from './recent-restaurants.module.css';

type Props = {
  /** Restaurants that can be shown (active and not hidden); others are left out of the row. */
  restaurants: MapRestaurant[];
  /** Restaurants the current filters show; the others are dimmed. */
  visibleIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
};

/** "최근 본" chips under the map: shown only once a restaurant card has been opened. */
export default function RecentRestaurants({ restaurants, visibleIds, onSelect }: Props) {
  const ids = useRecentRestaurantIds();
  const byId = new Map(restaurants.map((row) => [row.id, row]));
  const rows = ids.flatMap((id) => byId.get(id) ?? []);
  const { ref, hidden } = useHiddenEdges(rows.length);
  if (!rows.length) return null;
  return (
    <section className={styles.recent} aria-label="최근 본 식당">
      <span className={styles.title} role="img" aria-label="최근 본" title="최근 본 식당">
        <HistoryIcon size={18} />
      </span>
      <ul
        ref={ref}
        className={styles.chips}
        data-more-start={hidden.start || undefined}
        data-more-end={hidden.end || undefined}
      >
        {rows.map((row) => {
          const filtered = !visibleIds.has(row.id);
          return (
            <li key={row.id} className={styles.chip} data-filtered={filtered || undefined}>
              <button
                type="button"
                className={styles.name}
                aria-disabled={filtered || undefined}
                title={filtered ? '지금 필터에 가려진 식당이에요' : `${row.name} 지도에서 보기`}
                onClick={() => {
                  if (filtered)
                    showSnackbar('지금 필터에 가려진 식당이에요. 필터를 바꾸면 볼 수 있어요.');
                  else onSelect(row.id);
                }}
              >
                {row.name}
              </button>
              <button
                type="button"
                className={styles.remove}
                aria-label={`${row.name} 최근 본 목록에서 지우기`}
                title="지우기"
                onClick={() => recentRestaurants.remove(row.id)}
              >
                <CloseIcon size={12} />
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className={styles.clear}
        aria-label="최근 본 식당 모두 지우기"
        title="모두 지우기"
        onClick={recentRestaurants.clear}
      >
        <CloseIcon size={16} />
      </button>
    </section>
  );
}

/**
 * Which ends of the sideways-scrolling chip row hide chips, so only those edges fade out:
 * nothing fades when every chip fits, and the last chip is clear once scrolled to the end.
 */
function useHiddenEdges(count: number) {
  const ref = useRef<HTMLUListElement>(null);
  const [hidden, setHidden] = useState({ start: false, end: false });
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const measure = () => {
      const start = list.scrollLeft > 1;
      const end = list.scrollLeft + list.clientWidth < list.scrollWidth - 1;
      setHidden((current) =>
        current.start === start && current.end === end ? current : { start, end },
      );
    };
    measure();
    list.addEventListener('scroll', measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(list);
    return () => {
      list.removeEventListener('scroll', measure);
      resize.disconnect();
    };
  }, [count]);
  return { ref, hidden };
}
