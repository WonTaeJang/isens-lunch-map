'use client';

import useTodayLunch from './use-today-lunch';

/** Page title: "오늘 점심, 어디로 갈까요?" until today's lunch is recorded, then its name. */
export default function TodayLunchTitle() {
  const { visit } = useTodayLunch();
  if (!visit)
    return (
      <>
        오늘 점심, 어디로 갈까요<span>?</span>
      </>
    );
  return (
    <>
      오늘 점심, <span>{visit.restaurant_name}</span>
    </>
  );
}
