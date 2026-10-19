// 식당 정보가 비었을 때 화면에 보이는 문구: 지도·리스트·게임·내 정보·관리자 화면이 함께 씁니다.

export const NO_CATEGORY = '분류 정보 없음';
export const NO_ADDRESS = '주소 확인 필요';

export const categoryLabel = (category: string | null | undefined) => category || NO_CATEGORY;
export const addressLabel = (address: string | null | undefined) => address || NO_ADDRESS;

/** "카테고리 · 대표메뉴", leaving out an empty part (both empty: NO_CATEGORY). */
export function menuLine(row: { category: string | null; main_menu: string | null }) {
  return [row.category, row.main_menu].filter(Boolean).join(' · ') || NO_CATEGORY;
}
