"use client";

import { hasCoordinates } from "@/lib/coordinates";
import { formatDistance } from "@/lib/distance";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
const officeAddress = "서울 서초구 반포대로28길 43";

export type MapRestaurant = { id: string; name: string; category: string | null; main_menu: string | null; address: string | null; distance: string | null; latitude: string | null; longitude: string | null };
export default function LunchMap({ restaurants = [], focusRequest }: { restaurants?: MapRestaurant[]; focusRequest?: {id: string} | null }) {
  const mapRef = useRef<{setCenter: (position: object) => void} | null>(null);
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
    const defaultImage = new maps.MarkerImage('/restaurant-marker-default.svg', new maps.Size(32, 40), { offset: new maps.Point(16, 38.4) });
    const selectedImage = new maps.MarkerImage('/restaurant-marker-selected.svg', new maps.Size(40, 50), { offset: new maps.Point(20, 48) });
    let selectedMarker: InstanceType<typeof maps.Marker> | null = null;
    let currentInfo: InstanceType<typeof maps.InfoWindow> | null = null;
    const closeInfo = () => {
      currentInfo?.close(); currentInfo = null;
      selectedMarker?.setImage(defaultImage);
      selectedMarker?.setZIndex(0);
      selectedMarker = null;
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
    officeContent.textContent = '아이센스 ❤️';
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
    const markers = restaurants.filter(hasCoordinates).map(r => {
      const marker = new maps.Marker({ map, position: new maps.LatLng(Number(r.latitude), Number(r.longitude)), title: r.name, clickable: true, image: defaultImage });
      // Use textContent so imported spreadsheet text is never interpreted as HTML.
      const content = document.createElement('div');
      content.className = 'map-restaurant-info';
      const title = document.createElement('h3');
      title.textContent = r.name;
      content.append(title);
      for (const text of [r.category || '분류 정보 없음', `대표메뉴: ${r.main_menu || '정보 없음'}`, r.address || '주소 확인 필요', `거리: ${formatDistance(r.distance)}`]) {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        content.append(paragraph);
      }
      addCloseButton(content);
      const info = new maps.InfoWindow({ content, removable: false, zIndex: 20 });
      const onClick = () => {
        closeInfo();
        selectedMarker = marker;
        marker.setImage(selectedImage);
        marker.setZIndex(11);
        info.open(map, marker);
        currentInfo = info;
      };
      handlers.set(r.id, () => {
        map.setCenter(new maps.LatLng(Number(r.latitude), Number(r.longitude)));
        onClick();
      });
      maps.event.addListener(marker, 'click', onClick);
      return { marker, info, onClick };
    });
    return () => {
      closeInfo();
      handlers.clear();
      maps.event.removeListener(map, 'click', closeInfo);
      if (officeMarker) maps.event.removeListener(officeMarker, 'click', onOfficeClick);
      officeInfo.close();
      markers.forEach(({marker, info, onClick}) => {
        maps.event.removeListener(marker, 'click', onClick);
        info.close();
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
      {(!appKey || status !== "ready") && <div className="map-message" role="status"><span className="empty-symbol" aria-hidden="true">⌖</span><strong>{!appKey ? "지도 설정이 필요해요" : status === "error" ? "지도를 불러오지 못했어요" : "지도를 펼치고 있어요"}</strong><p>{!appKey ? "카카오맵 키를 설정하면 지도를 볼 수 있어요." : status === "error" ? "키와 등록 도메인, 네트워크 연결을 확인해 주세요." : "잠시만 기다려 주세요."}</p>{status === "error" && <button className="button" onClick={() => window.location.reload()}>다시 시도</button>}</div>}
      {appKey && <Script id="kakao-maps-sdk" src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`} strategy="afterInteractive" onReady={initializeMap} onError={() => setStatus("error")} />}
    </section>
  );
}
