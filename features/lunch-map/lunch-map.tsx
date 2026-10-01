'use client';

import type { ReviewCounts } from '@/features/reviews/review-model';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/button';
import RestaurantMapCard from './restaurant-map-card';
import { createMapController, OFFICE_ADDRESS, type MapController } from './map-controller';
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
};

export default function LunchMap({ reviewedIds, reviewCounts, restaurants, favorites, selectedId, focusRequest, onSelect, onFavorite, onReviews }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [controller, setController] = useState<MapController | null>(null);
  const [error, setError] = useState(false);
  const selected = restaurants.find(row => row.id === selectedId);

  useEffect(() => {
    if (!APP_KEY) return;
    let disposed = false;
    let instance: MapController | null = null;
    const timer = window.setTimeout(() => setError(true), 15000);
    const maps = window.kakao?.maps;
    if (sdkReady && maps) {
      maps.load(() => {
        if (disposed) return;
        try {
          new maps.services.Geocoder().addressSearch(OFFICE_ADDRESS, (results, status) => {
            if (disposed || !containerRef.current) return;
            window.clearTimeout(timer);
            const location = results[0];
            if (status !== maps.services.Status.OK || !location) { setError(true); return; }
            try {
              const center = new maps.LatLng(Number(location.y), Number(location.x));
              const map = new maps.Map(containerRef.current, { center, level: 4 });
              map.setMaxLevel(5);
              map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
              instance = createMapController(maps, map, center, containerRef.current, onSelect);
              setController(instance);
              setError(false);
            } catch { setError(true); }
          });
        } catch { setError(true); }
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
  }, [sdkReady, onSelect]);

  useEffect(() => {
    controller?.update(restaurants, favorites, selectedId);
  }, [controller, restaurants, favorites, selectedId]);

  useEffect(() => {
    if (focusRequest) controller?.focus(focusRequest.id);
  }, [controller, focusRequest]);

  const ready = Boolean(controller);
  return (
    <section className="map-panel" aria-label="점심 지도">
      <div ref={containerRef} className="map-canvas" aria-label={`아이센스 회사 주변 지도: ${OFFICE_ADDRESS}`} />
      {ready && <button type="button" className="map-center-button" aria-label="아이센스 빌딩 중심으로 지도 이동" onClick={() => controller?.center()}><span aria-hidden="true">⌖</span></button>}
      {!ready && (
        <div className="map-message" role="status">
          <span className="empty-symbol" aria-hidden="true">⌖</span>
          <strong>{!APP_KEY ? '지도 설정이 필요해요' : error ? '지도를 불러오지 못했어요' : '지도를 펼치고 있어요'}</strong>
          <p>{!APP_KEY ? '카카오맵 키를 설정하면 지도를 볼 수 있어요.' : error ? '키와 등록 도메인, 네트워크 연결을 확인해 주세요.' : '잠시만 기다려 주세요.'}</p>
          {error && <Button onClick={() => window.location.reload()}>다시 시도</Button>}
        </div>
      )}
      {controller && selected && createPortal(
        <RestaurantMapCard reviewed={reviewedIds?.has(selected.id) ?? false} counts={reviewCounts === null ? null : reviewCounts[selected.id] ?? { recommended: 0, not_recommended: 0 }} key={selected.id} restaurant={selected} favorite={favorites.has(selected.id)} onClose={() => onSelect(null)} onReviews={() => onReviews(selected.id)} onFavorite={() => onFavorite(selected.id)} />,
        controller.host,
      )}
      {APP_KEY && <Script id="kakao-maps-sdk" src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(APP_KEY)}&autoload=false&libraries=services`} strategy="afterInteractive" onReady={() => setSdkReady(true)} onError={() => setError(true)} />}
    </section>
  );
}
