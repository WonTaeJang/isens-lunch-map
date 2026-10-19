'use client';

import { menuLine } from '@/lib/restaurant-labels';
import { prefersReducedMotion } from '@/lib/motion';
import Button from '@/components/ui/button';
import FilterChip from '@/components/ui/filter-chip';
import {
  categoryOf,
  DEFAULT_FILTERS,
  gameCandidates,
  type RestaurantFilters,
} from '@/features/lunch-map/filter-restaurants';
import { RestaurantFilterChips } from '@/features/lunch-map/restaurant-filter-controls';
import DistanceBadge from '@/features/lunch-map/distance-badge';
import ReviewCountBadges from '@/features/reviews/review-counts';
import { getReviewCounts, type ReviewCounts } from '@/lib/reviews/model';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import ModalDialog from '@/components/ui/modal-dialog';
import { hasCoordinates } from '@/lib/coordinates';
import type { MapRestaurant } from '@/lib/restaurant-types';
import { boxPosition, createBoxes, type BoxHistoryEntry, type LunchBox } from './model';
import styles from './lunch-box.module.css';
import BoxHistory from './box-history';

export default function LunchBoxGame({
  onClose,
  initialFilters,
  history,
  onRecord,
  restaurants,
  reviewCounts,
  favorites,
  onSelect,
}: {
  history: BoxHistoryEntry[];
  onRecord: (entry: BoxHistoryEntry) => void;
  onClose: () => void;
  initialFilters: RestaurantFilters;
  restaurants: MapRestaurant[];
  reviewCounts: ReviewCounts | null;
  favorites: ReadonlySet<string>;
  onSelect: (id: string) => void;
}) {
  const [filters, setFilters] = useState<RestaurantFilters>({ ...initialFilters, query: '' });
  const [categories, setCategories] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [boxes, setBoxes] = useState<LunchBox[]>(() =>
    createBoxes(gameCandidates(restaurants, initialFilters, favorites)),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<'shuffle' | 'choose' | 'opening' | 'result'>('shuffle');
  const [closing, setClosing] = useState(false);
  const locked = useRef(false);
  const skipPress = useRef<'shuffle' | 'opening' | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const press = useRef<{ index: number; pointerId: number } | null>(null);
  function cancelPress() {
    press.current = null;
    setPressed(null);
  }
  const boxRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const recorded = useRef<LunchBox | null>(null);
  const winner = selected === null ? null : boxes[selected];

  const candidates = gameCandidates(restaurants, filters, favorites, categories);
  const categoryOptions = [...new Set(restaurants.map(categoryOf))].sort((a, b) =>
    a.localeCompare(b, 'ko'),
  );
  const filterBusy = phase === 'opening' || phase === 'shuffle';
  const filterSummary = [
    filters.maxDistance === null ? '전체 거리' : `${filters.maxDistance}m 이내`,
    categories.length ? categories.join(' · ') : '전체 카테고리',
    filters.favoritesOnly ? '즐겨찾기만' : '',
  ]
    .filter(Boolean)
    .join(' / ');
  function changeFilters(next: RestaurantFilters, nextCategories = categories) {
    if (filterBusy) return;
    setFilters(next);
    setCategories(nextCategories);
    const rows = gameCandidates(restaurants, next, favorites, nextCategories);
    setBoxes(createBoxes(rows));
    cancelPress();
    setSelected(null);
    locked.current = false;
    setPhase('choose');
  }
  useEffect(() => {
    if (phase !== 'shuffle') return;
    let cancelled = false;
    if (boxes.length < 2 || prefersReducedMotion()) {
      const timer = window.setTimeout(() => setPhase('choose'), 0);
      return () => window.clearTimeout(timer);
    }
    const offset = Math.random() * Math.PI * 2;
    const animations = boxes.map((_, index) => {
      const element = boxRefs.current[index]!;
      const parent = element.parentElement!.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const baseScale = Number.parseFloat(getComputedStyle(element).scale) || 1;
      const home = (rect.left + rect.width / 2 - (parent.left + parent.width / 2)) / baseScale;
      const radius = Math.min(parent.width * 0.24, 210) / baseScale;
      const depth = Math.min(parent.width * 0.08, 55) / baseScale;
      const smooth = (value: number) => value * value * (3 - 2 * value);
      const frames = Array.from({ length: 81 }, (_, frame) => {
        const t = frame / 80;
        const orbitT = Math.max(0, Math.min(1, (t - 0.15) / 0.65));
        const angle =
          offset + (index * Math.PI * 2) / boxes.length + smooth(orbitT) * Math.PI * 2.4;
        const z = Math.sin(angle);
        const blend = t < 0.15 ? smooth(t / 0.15) : t > 0.8 ? 1 - smooth((t - 0.8) / 0.2) : 1;
        const x = home * (1 - blend) + Math.cos(angle) * radius * blend;
        const y = z * depth * blend;
        const size = 1 + (-0.12 + z * 0.16) * blend;
        return {
          offset: t,
          transform: `translate(${x}px, ${y}px) scale(${size})`,
          zIndex: String(Math.round(100 + z * 50)),
        };
      });
      return element.animate(frames, { duration: 1000, easing: 'linear', fill: 'none' });
    });
    void Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        if (!cancelled) setPhase('choose');
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      animations.forEach((animation) => animation.cancel());
    };
  }, [phase, boxes]);
  useEffect(() => {
    if (phase !== 'opening') return;
    const timer = window.setTimeout(() => setPhase('result'), 2100);
    return () => window.clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'result' || !winner || selected === null || recorded.current === winner) return;
    recorded.current = winner;
    resultRef.current?.focus();
    onRecord({
      ...winner,
      id: crypto.randomUUID(),
      position: boxPosition(selected, boxes.length),
      counts: getReviewCounts(reviewCounts, winner.restaurant.id),
    });
  }, [phase, winner, selected, boxes.length, reviewCounts, onRecord]);
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(onClose, 420);
    return () => window.clearTimeout(timer);
  }, [closing, onClose]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function select(index: number) {
    if (locked.current || phase !== 'choose') return;
    skipPress.current = null;
    cancelPress();
    locked.current = true;
    setSelected(index);
    setPhase(prefersReducedMotion() ? 'result' : 'opening');
  }
  function again() {
    skipPress.current = null;
    setBoxes(createBoxes(candidates, winner?.restaurant.id));
    cancelPress();
    setSelected(null);
    setPhase('shuffle');
    locked.current = false;
  }

  return (
    <ModalDialog
      className={styles.dialog}
      data-closing={closing || undefined}
      data-phase={phase}
      data-color={winner?.color}
      aria-labelledby="lunch-box-title"
      // Closes after its exit animation.
      onClose={() => setClosing(true)}
    >
      <div className={styles.world}>
        <div className={styles.stars} aria-hidden="true" />
        <header className={styles.header}>
          <span className={styles.brand}>
            LUNCH MAP <span>/</span> 설레는 점심시간
          </span>
          <button className={styles.close} onClick={() => setClosing(true)} aria-label="게임 닫기">
            <CloseIcon size={24} />
          </button>
        </header>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>A LITTLE SURPRISE FOR LUNCH</p>
          <h2 id="lunch-box-title">오늘의 점심 상자</h2>
          <p aria-live="polite">
            {phase === 'shuffle'
              ? '점심 상자를 섞고 있어요…'
              : phase === 'choose'
                ? pressed !== null
                  ? '손을 떼면 점심 상자가 열려요.'
                  : '상자를 꾹 눌렀다가 놓아보세요.'
                : phase === 'opening'
                  ? '맛있는 점심을 꺼내고 있어요…'
                  : '오늘의 점심을 발견했어요.'}
          </p>
        </div>
        <section
          className={styles.filterPanel}
          aria-label="점심 상자 필터"
          data-expanded={filtersOpen || undefined}
        >
          <div className={styles.filterHeading}>
            <button
              type="button"
              className={styles.filterToggle}
              aria-expanded={filtersOpen}
              aria-controls="lunch-box-filters"
              onClick={() => setFiltersOpen((value) => !value)}
            >
              필터 {filtersOpen ? '접기' : '설정'}
            </button>
            <span className={styles.filterTitle}>뽑기 조건</span>
            <span className={styles.candidateCount} role="status">
              후보 {candidates.length}곳
            </span>
            <button
              type="button"
              className={styles.filterReset}
              disabled={
                filterBusy ||
                (filters.maxDistance === null && !filters.favoritesOnly && !categories.length)
              }
              onClick={() => changeFilters(DEFAULT_FILTERS, [])}
            >
              초기화
            </button>
          </div>
          <fieldset id="lunch-box-filters" className={styles.filterControls} disabled={filterBusy}>
            <legend className={styles.filterLegend}>거리 · 카테고리 · 즐겨찾기</legend>
            <RestaurantFilterChips
              className={styles.filterChips}
              maxDistance={filters.maxDistance}
              favoritesOnly={filters.favoritesOnly}
              onDistanceChange={(maxDistance) => changeFilters({ ...filters, maxDistance })}
              onFavoritesOnlyChange={(favoritesOnly) =>
                changeFilters({ ...filters, favoritesOnly })
              }
            />
            <div className={styles.categoryFilters} role="group" aria-label="카테고리 필터">
              <FilterChip selected={!categories.length} onClick={() => changeFilters(filters, [])}>
                전체 음식
              </FilterChip>
              {categoryOptions.map((category) => (
                <FilterChip
                  key={category}
                  selected={categories.includes(category)}
                  onClick={() =>
                    changeFilters(
                      filters,
                      categories.includes(category)
                        ? categories.filter((value) => value !== category)
                        : [...categories, category],
                    )
                  }
                >
                  {category}
                </FilterChip>
              ))}
            </div>
          </fieldset>
          <p className={styles.filterSummary}>{filterSummary}</p>
        </section>
        <div className={styles.stage}>
          {(phase === 'shuffle' || phase === 'opening') && (
            <button
              type="button"
              className={styles.shuffleSkip}
              aria-label="연출 건너뛰기"
              onPointerDown={(event) => {
                if (event.isPrimary && event.button === 0) skipPress.current = phase;
              }}
              onPointerCancel={() => {
                skipPress.current = null;
              }}
              onPointerLeave={() => {
                skipPress.current = null;
              }}
              onClick={(event) => {
                event.stopPropagation();
                // Mobile can deliver the box's delayed click to this newly mounted overlay.
                // Only a new press on the skip control (or keyboard/AT activation) may skip.
                const deliberate = event.detail === 0 || skipPress.current === phase;
                skipPress.current = null;
                if (!deliberate) return;
                cancelPress();
                setPhase(phase === 'opening' ? 'result' : 'choose');
              }}
            />
          )}
          {!boxes.length ? (
            <div className={styles.message} role="status">
              <p>조건에 맞는 식당이 없어요.</p>
              <Button variant="secondary" onClick={() => changeFilters(DEFAULT_FILTERS, [])}>
                필터 초기화
              </Button>
            </div>
          ) : (
            <>
              <div className={styles.boxes}>
                {boxes.map((_, index) => (
                  <button
                    // The visual slot is stable; only its hidden restaurant changes with filters.
                    key={index}
                    ref={(element) => {
                      boxRefs.current[index] = element;
                    }}
                    className={styles.boxChoice}
                    data-selected={selected === index || undefined}
                    data-hidden={(selected !== null && selected !== index) || undefined}
                    disabled={phase !== 'choose'}
                    data-pressed={pressed === index || undefined}
                    onPointerDown={(event) => {
                      if (!event.isPrimary || event.button !== 0 || locked.current || press.current)
                        return;
                      press.current = { index, pointerId: event.pointerId };
                      setPressed(index);
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (press.current?.pointerId !== event.pointerId) return;
                      const bounds = event.currentTarget.getBoundingClientRect();
                      if (
                        event.clientX < bounds.left ||
                        event.clientX > bounds.right ||
                        event.clientY < bounds.top ||
                        event.clientY > bounds.bottom
                      )
                        cancelPress();
                    }}
                    onPointerUp={(event) => {
                      if (press.current?.pointerId !== event.pointerId) return;
                      const bounds = event.currentTarget.getBoundingClientRect();
                      const inside =
                        event.clientX >= bounds.left &&
                        event.clientX <= bounds.right &&
                        event.clientY >= bounds.top &&
                        event.clientY <= bounds.bottom;
                      cancelPress();
                      if (inside) select(index);
                    }}
                    onPointerCancel={cancelPress}
                    onLostPointerCapture={cancelPress}
                    onBlur={cancelPress}
                    onKeyDown={(event) => {
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        if (!event.repeat && !locked.current) setPressed(index);
                      }
                      if (event.key === 'Escape') cancelPress();
                    }}
                    onKeyUp={(event) => {
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        if (pressed === index) select(index);
                      }
                    }}
                    onClick={(event) => {
                      // Assistive technology can activate without pointer or key events.
                      if (event.detail === 0) select(index);
                    }}
                    aria-label={`${index + 1}번 점심 상자 열기`}
                    style={{ '--slot': index - (boxes.length - 1) / 2 } as CSSProperties}
                  >
                    <span className={styles.aura} />
                    <span className={styles.previewGlow} aria-hidden="true">
                      <span className={styles.sparkles}>✧ · ✦ · ✧</span>
                    </span>
                    <span className={styles.chest} aria-hidden="true">
                      <span className={styles.innerLight} />
                      <span className={styles.rays} />
                      <span className={`${styles.seam} ${styles.seamFront}`} />
                      <span className={`${styles.seam} ${styles.seamBack}`} />
                      <span className={`${styles.seam} ${styles.seamLeft}`} />
                      <span className={`${styles.seam} ${styles.seamRight}`} />
                      <span className={styles.boxFront} />
                      <span className={styles.boxBack} />
                      <span className={styles.boxLeft} />
                      <span className={styles.boxRight} />
                      <span className={styles.boxBottom} />
                      <span className={styles.lid}>
                        <span className={styles.lidTop} />
                        <span className={styles.lidBottom} />
                        <span className={styles.lidFront} />
                        <span className={styles.lidBack} />
                        <span className={styles.lidLeft} />
                        <span className={styles.lidRight} />
                        <span className={styles.bowLeft} />
                        <span className={styles.bowRight} />
                        <span className={styles.bowKnot} />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {(phase === 'opening' || phase === 'result') && (
                <div className={styles.effects} aria-hidden="true">
                  <div className={styles.beam} />
                  <div className={styles.ring} />
                  {Array.from({ length: 28 }, (_, i) => (
                    <i
                      key={i}
                      style={
                        {
                          '--angle': `${i * 137.5}deg`,
                          '--travel': `${100 + (i % 5) * 36}px`,
                          '--delay': `${(i % 4) * 0.07}s`,
                          '--hue': `${(i % 7) * (360 / 7)}deg`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              )}
              {phase === 'result' && winner && (
                <section className={styles.result}>
                  <p className={styles.eyebrow}>YOUR LUNCH TODAY</p>
                  <h3 ref={resultRef} tabIndex={-1}>
                    {winner.restaurant.name}
                  </h3>
                  <p className={styles.menu}>{menuLine(winner.restaurant)}</p>
                  <div className={styles.resultStats}>
                    <DistanceBadge distance={winner.restaurant.distance} />
                    <ReviewCountBadges
                      colored
                      counts={getReviewCounts(reviewCounts, winner.restaurant.id)}
                    />
                  </div>
                  <div className={styles.actions}>
                    <Button variant="secondary" onClick={again}>
                      다시 뽑기
                    </Button>
                    {hasCoordinates(winner.restaurant) && (
                      <Button onClick={() => onSelect(winner.restaurant.id)}>지도에서 보기</Button>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
        <BoxHistory entries={history} onSelect={onSelect} />
        <footer className={styles.footer}>
          <p>
            <span>블루 60% · 퍼플 30% · 골드 9% · 무지개 1%</span>
          </p>
          <small>빛의 색은 무작위이며, 식당의 평가와는 관계없어요.</small>
        </footer>
      </div>
    </ModalDialog>
  );
}
