// 다른 화면에서 지도의 특정 식당으로 이동하는 링크
/** id of the map + list layout on the home page; links scroll to it. */
export const LUNCH_MAP_ANCHOR = 'lunch-map-layout';

/** Home page link that selects the restaurant on the map. */
export function restaurantMapHref(id: string) {
  return `/?restaurant=${encodeURIComponent(id)}#${LUNCH_MAP_ANCHOR}`;
}
