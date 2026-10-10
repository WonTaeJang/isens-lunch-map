/** Why a restaurant cannot be hidden right now, or null when it can. */
export function hideBlockReason({
  favorite,
  todayLunch,
}: {
  favorite: boolean;
  todayLunch: boolean;
}) {
  if (todayLunch) return '오늘의 점심으로 고른 식당은 숨길 수 없어요.';
  if (favorite) return '즐겨찾기를 해제한 뒤 숨길 수 있어요.';
  return null;
}
