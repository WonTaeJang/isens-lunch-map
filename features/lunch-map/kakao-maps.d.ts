export type KakaoMaps = {
  load: (callback: () => void) => void;
  LatLng: new (latitude: number, longitude: number) => object;
  Map: new (
    container: HTMLElement,
    options: { center: object; level: number },
  ) => {
    setCenter: (position: object) => void;
    panBy: (x: number, y: number) => void;
    setMaxLevel: (level: number) => void;
    getLevel: () => number;
    addControl: (control: object, position: number) => void;
  };
  ZoomControl: new () => object;
  ControlPosition: { RIGHT: number };
  Size: new (width: number, height: number) => object;
  Point: new (x: number, y: number) => object;
  MarkerImage: new (src: string, size: object, options: { offset: object }) => object;
  Marker: new (options: {
    map: object;
    position: object;
    title?: string;
    clickable?: boolean;
    image?: object;
    zIndex?: number;
  }) => {
    setMap: (map: object | null) => void;
    setImage: (image: object) => void;
    setZIndex: (zIndex: number) => void;
  };
  CustomOverlay: new (options: {
    content: HTMLElement;
    position: object;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
    clickable?: boolean;
  }) => { setPosition: (position: object) => void; setMap: (map: object | null) => void };
  InfoWindow: new (options: { content: HTMLElement; removable?: boolean; zIndex?: number }) => {
    open: (map: object, marker: object) => void;
    close: () => void;
  };
  event: {
    addListener: (target: object, type: string, callback: () => void) => void;
    removeListener: (target: object, type: string, callback: () => void) => void;
  };
  services: {
    Status: { OK: string };
    Geocoder: new () => {
      addressSearch: (
        address: string,
        callback: (results: { x: string; y: string }[], status: string) => void,
      ) => void;
    };
  };
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}
