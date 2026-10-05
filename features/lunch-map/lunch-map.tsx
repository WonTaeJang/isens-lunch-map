'use client';
import { getReviewCounts } from '@/lib/reviews/model';

import LoadingSpinner from '@/components/ui/loading-spinner';
import { BowlChopsticksIcon, CrosshairIcon, DiceIcon } from '@/components/ui/icons';

import type { ReviewCounts } from '@/lib/reviews/model';
import Script from 'next/script';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/button';
import useTodayLunchAction from '@/features/lunch-visits/use-today-lunch-action';
import RestaurantMapCard from './restaurant-map-card';
import {
  createMapController,
  OFFICE_ADDRESS,
  OFFICE_POSITION,
  type MapController,
} from './map-controller';
import labelStyles from './map-label.module.css';
import { withEuro } from '@/lib/korean';
import type { MapRestaurant } from '@/lib/restaurant-types';

const APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
type Props = {
  reviewedIds: ReadonlySet<string> | null;
  reviewCounts: ReviewCounts | null;
  restaurants: MapRestaurant[];
  favorites: ReadonlySet<string>;
  selectedId: string | null;
  focusRequest: { id: string } | null;
  onReviews: (id: string) => void;
  onSelect: (id: string | null) => void;
  onFavorite: (id: string) => string | null;
  randomDisabled: boolean;
  /** Opens the random pick dialog. */
  onRandom: () => void;
  /** Shows today's lunch restaurant on the map. */
  onShowTodayLunch: (restaurantId: string) => void;
};

export default function LunchMap({
  reviewedIds,
  reviewCounts,
  restaurants,
  favorites,
  selectedId,
  focusRequest,
  onSelect,
  onFavorite,
  onReviews,
  randomDisabled,
  onRandom,
  onShowTodayLunch,
}: Props) {
  const onSelectRef = useRef(onSelect);
  useLayoutEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [controller, setController] = useState<MapController | null>(null);
  const [error, setError] = useState(false);
  const selected = restaurants.find((row) => row.id === selectedId);
  const todayLunch = useTodayLunchAction();
  const todayVisit = todayLunch.visit;

  useEffect(() => {
    if (!APP_KEY) return;
    let disposed = false;
    let instance: MapController | null = null;
    const timer = window.setTimeout(() => setError(true), 15000);
    const maps = window.kakao?.maps;
    if (sdkReady && maps) {
      maps.load(() => {
        window.clearTimeout(timer);
        if (disposed || !containerRef.current) return;
        try {
          const center = new maps.LatLng(OFFICE_POSITION.latitude, OFFICE_POSITION.longitude);
          const map = new maps.Map(containerRef.current, { center, level: 4 });
          map.setMaxLevel(5);
          map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
          instance = createMapController(
            maps,
            map,
            center,
            containerRef.current,
            (id) => onSelectRef.current(id),
            { anchor: labelStyles.anchor, label: labelStyles.label },
          );
          setController(instance);
          setError(false);
        } catch {
          setError(true);
        }
      });
    }
    const container = containerRef.current;
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      instance?.dispose();
      // The SDK has no map destroy method. Drop its detached DOM on unmount.
      if (instance) container?.replaceChildren();
    };
  }, [sdkReady]);

  useEffect(() => {
    controller?.update(restaurants, favorites, selectedId, reviewedIds);
  }, [controller, restaurants, favorites, selectedId, reviewedIds]);

  useEffect(() => {
    if (focusRequest) controller?.focus(focusRequest.id);
  }, [controller, focusRequest]);

  const ready = Boolean(controller);
  return (
    <section className="map-panel" aria-label="점심 지도">
      <div
        ref={containerRef}
        className="map-canvas"
        aria-label={`아이센스 회사 주변 지도: ${OFFICE_ADDRESS}`}
      />
      {ready && (
        <div className="map-controls">
          <MapControlButton
            label="랜덤 추천"
            title="랜덤 추천"
            icon={<DiceIcon size={18} />}
            disabled={randomDisabled}
            onClick={onRandom}
          />
          {todayVisit && (
            <MapControlButton
              label={`오늘의 점심 ${withEuro(todayVisit.restaurant_name)} 지도 이동`}
              title={`오늘의 점심 · ${todayVisit.restaurant_name}`}
              icon={<BowlChopsticksIcon size={18} />}
              onClick={() => onShowTodayLunch(todayVisit.restaurant_id)}
            />
          )}
          <MapControlButton
            label="아이센스 빌딩 중심으로 지도 이동"
            title="아이센스 빌딩으로 이동"
            icon={<CrosshairIcon size={18} />}
            onClick={() => controller?.center()}
          />
        </div>
      )}
      {!ready && (
        <div className="map-message" role="status">
          {APP_KEY && !error ? (
            <LoadingSpinner size={40} />
          ) : (
            <span className="empty-symbol" aria-hidden="true">
              <CrosshairIcon size={28} />
            </span>
          )}
          <strong>
            {!APP_KEY
              ? '지도 설정이 필요해요'
              : error
                ? '지도를 불러오지 못했어요'
                : '지도를 펼치고 있어요'}
          </strong>
          <p>
            {!APP_KEY
              ? '카카오맵 키를 설정하면 지도를 볼 수 있어요.'
              : error
                ? '키와 등록 도메인, 네트워크 연결을 확인해 주세요.'
                : '잠시만 기다려 주세요.'}
          </p>
          {error && <Button onClick={() => window.location.reload()}>다시 시도</Button>}
        </div>
      )}
      {controller &&
        selected &&
        createPortal(
          <RestaurantMapCard
            reviewed={reviewedIds?.has(selected.id) ?? false}
            counts={getReviewCounts(reviewCounts, selected.id)}
            key={selected.id}
            restaurant={selected}
            favorite={favorites.has(selected.id)}
            todayLunch={todayLunch.visit?.restaurant_id === selected.id}
            todayLunchBusy={todayLunch.busy}
            onClose={() => onSelect(null)}
            onReviews={() => onReviews(selected.id)}
            onFavorite={() => onFavorite(selected.id)}
            onTodayLunch={() => todayLunch.request(selected)}
          />,
          controller.host,
        )}
      {/* Outside the map card so Escape closes only the dialog, not the card. */}
      {todayLunch.dialog}
      {APP_KEY && (
        <Script
          id="kakao-maps-sdk"
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(APP_KEY)}&autoload=false`}
          strategy="afterInteractive"
          onReady={() => setSdkReady(true)}
          onError={() => setError(true)}
        />
      )}
    </section>
  );
}

/** 32px icon button stacked at the bottom right of the map. */
function MapControlButton({
  label,
  title,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="map-control-button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
