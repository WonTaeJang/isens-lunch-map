"use client";
import Button from './button';

import { hasCoordinates } from "@/lib/coordinates";
import { FAVORITES_CHANGED_EVENT, FAVORITES_STORAGE_KEY, readFavorites, toggleFavorite } from '@/lib/favorites';
import { createRestaurantMapCard } from './restaurant-map-card';
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
const EMPTY_RESTAURANTS: MapRestaurant[] = [];
const officeAddress = "서울 서초구 반포대로28길 43";

import type { MapRestaurant } from '@/lib/restaurant-types';
export default function LunchMap({ restaurants = EMPTY_RESTAURANTS, focusRequest }: { restaurants?: MapRestaurant[]; focusRequest?: {id: string} | null }) {
  const mapRef = useRef<{setCenter: (position: object) => void; panBy: (x: number, y: number) => void} | null>(null);
  const officeCenterRef = useRef<object | null>(null);
  const focusHandlers = useRef(new Map<string, () => void>());
  const officeMarkerRef = useRef<object | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!appKey || status !== "loading") return;
    const timer = window.setTimeout(() => setStatus("error"), 15000);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    const maps = window.kakao?.maps;
    if (status !== 'ready' || !maps || !mapRef.current) return;
    const map = mapRef.current;
    const defaultImage = new maps.MarkerImage('/restaurant-marker-default.svg', new maps.Size(24, 30), { offset: new maps.Point(12, 28.8) });
    const selectedImage = new maps.MarkerImage('/restaurant-marker-selected.svg', new maps.Size(40, 50), { offset: new maps.Point(20, 48) });
    const favoriteImage = new maps.MarkerImage('/restaurant-marker-default-favorite.svg', new maps.Size(24, 30), { offset: new maps.Point(12, 28.8) });
    const selectedFavoriteImage = new maps.MarkerImage('/restaurant-marker-selected-favorite.svg', new maps.Size(40, 50), { offset: new maps.Point(20, 48) });
    let favorites = new Set<string>();
    try { favorites = new Set(readFavorites(window.localStorage)); } catch { /* Storage may be blocked. */ }
    let selectedId: string | null = null;
    const markerImage = (id: string, selected: boolean) => favorites.has(id)
      ? (selected ? selectedFavoriteImage : favoriteImage)
      : (selected ? selectedImage : defaultImage);
    let selectedMarker: InstanceType<typeof maps.Marker> | null = null;
    let currentInfo: {close: () => void} | null = null;
    const closeInfo = () => {
      currentInfo?.close(); currentInfo = null;
      if (selectedId) selectedMarker?.setImage(markerImage(selectedId, false));
      selectedMarker?.setZIndex(0);
      selectedMarker = null;
      selectedId = null;
    };
    const addCloseButton = (content: HTMLElement) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'map-info-close';
      button.setAttribute('aria-label', '상세 정보 닫기');
      button.textContent = '×';
      button.onclick = closeInfo;
      content.append(button);
    };
    maps.event.addListener(map, 'click', closeInfo);
    const officeMarker = officeMarkerRef.current;
    const officeContent = document.createElement('div');
    officeContent.className = 'map-office-info';
    officeContent.textContent = '아이센스 빌딩';
    addCloseButton(officeContent);
    const officeInfo = new maps.InfoWindow({ content: officeContent, removable: false, zIndex: 20 });
    const onOfficeClick = () => {
      if (!officeMarker) return;
      closeInfo();
      officeInfo.open(map, officeMarker);
      currentInfo = officeInfo;
    };
    if (officeMarker) maps.event.addListener(officeMarker, 'click', onOfficeClick);
    const handlers = focusHandlers.current;
    const markers = restaurants.filter(hasCoordinates).map(restaurant => {
      const position = new maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude));
      const marker = new maps.Marker({map, position, title: restaurant.name, clickable: true, image: markerImage(restaurant.id, false)});
      const card = createRestaurantMapCard(restaurant, closeInfo, () => {
        try {
          favorites = new Set(toggleFavorite(window.localStorage, restaurant.id));
          window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
          card.showMessage('');
        } catch {
          card.showMessage('저장하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요.');
        }
      });
      card.setFavorite(favorites.has(restaurant.id));
      const overlay = new maps.CustomOverlay({content: card.content, position, xAnchor: 0.5, yAnchor: 1, zIndex: 20});
      const onClick = () => {
        closeInfo();
        selectedId = restaurant.id;
        selectedMarker = marker;
        marker.setImage(markerImage(restaurant.id, true));
        marker.setZIndex(11);
        overlay.setMap(map);
        currentInfo = {close: () => overlay.setMap(null)};
      };
      // Recenter only when a restaurant is chosen from the list.
      handlers.set(restaurant.id, () => {
        map.setCenter(position);
        onClick();
        const height = containerRef.current?.clientHeight ?? 450;
        map.panBy(0, -Math.max(0, 310 - height / 2));
      });
      maps.event.addListener(marker, 'click', onClick);
      return {id: restaurant.id, marker, overlay, card, onClick};
    });
    const refreshFavorites = () => {
      try { favorites = new Set(readFavorites(window.localStorage)); } catch { return; }
      markers.forEach(({id, marker, card}) => {
        marker.setImage(markerImage(id, id === selectedId));
        card.setFavorite(favorites.has(id));
      });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === FAVORITES_STORAGE_KEY || event.key === null) refreshFavorites();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(FAVORITES_CHANGED_EVENT, refreshFavorites);
    return () => {
      closeInfo();
      handlers.clear();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refreshFavorites);
      maps.event.removeListener(map, 'click', closeInfo);
      if (officeMarker) maps.event.removeListener(officeMarker, 'click', onOfficeClick);
      officeInfo.close();
      markers.forEach(({marker, overlay, onClick}) => {
        maps.event.removeListener(marker, 'click', onClick);
        overlay.setMap(null);
        marker.setMap(null);
      });
    };
  }, [restaurants, status]);

  useEffect(() => {
    if (focusRequest && status === 'ready') focusHandlers.current.get(focusRequest.id)?.();
  }, [focusRequest, status, restaurants]);

  function initializeMap() {
    const maps = window.kakao?.maps;
    if (!maps) { setStatus("error"); return; }
    maps.load(() => {
      if (!containerRef.current || initializedRef.current) return;
      try {
        new maps.services.Geocoder().addressSearch(officeAddress, (results, resultStatus) => {
          if (!containerRef.current || initializedRef.current) return;
          const location = results[0];
          if (resultStatus !== maps.services.Status.OK || !location) {
            setStatus("error");
            return;
          }
          try {
            const center = new maps.LatLng(Number(location.y), Number(location.x));
            officeCenterRef.current = center;
            const map = new maps.Map(containerRef.current, { center, level: 4 });
            map.setMaxLevel(5);
            map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
            mapRef.current = map;
            const officeImage = new maps.MarkerImage('/office-marker.svg', new maps.Size(40, 50), { offset: new maps.Point(20, 48) });
            officeMarkerRef.current = new maps.Marker({ map, position: center, title: "아이센스 빌딩", image: officeImage, zIndex: 10, clickable: true });
            initializedRef.current = true;
            setStatus("ready");
          } catch { setStatus("error"); }
        });
      } catch { setStatus("error"); }
    });
  }

  return (
    <section className="map-panel" aria-label="점심 지도">
      <div ref={containerRef} className="map-canvas" aria-label={`아이센스 회사 주변 지도: ${officeAddress}`} />
      {status === 'ready' && <button type="button" className="map-center-button" aria-label="아이센스 빌딩 중심으로 지도 이동" onClick={() => {
        if (officeCenterRef.current) mapRef.current?.setCenter(officeCenterRef.current);
      }}><span aria-hidden="true">⌖</span></button>}
      {(!appKey || status !== "ready") && <div className="map-message" role="status"><span className="empty-symbol" aria-hidden="true">⌖</span><strong>{!appKey ? "지도 설정이 필요해요" : status === "error" ? "지도를 불러오지 못했어요" : "지도를 펼치고 있어요"}</strong><p>{!appKey ? "카카오맵 키를 설정하면 지도를 볼 수 있어요." : status === "error" ? "키와 등록 도메인, 네트워크 연결을 확인해 주세요." : "잠시만 기다려 주세요."}</p>{status === "error" && <Button  onClick={() => window.location.reload()}>다시 시도</Button>}</div>}
      {appKey && <Script id="kakao-maps-sdk" src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`} strategy="afterInteractive" onReady={initializeMap} onError={() => setStatus("error")} />}
    </section>
  );
}
