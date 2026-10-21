// 소식·사용법 페이지의 주소와 탭: 헤더 아이콘, 홈 공지 미리보기, 페이지가 함께 씁니다.

/** The 소식·사용법 page. */
export const NEWS_PATH = '/guide';

export const NEWS_TABS = [
  { value: 'notice', label: '공지' },
  { value: 'guide', label: '사용법' },
] as const;
export type NewsTab = (typeof NEWS_TABS)[number]['value'];

/** The tab of `?tab=`: 사용법 when asked for, otherwise 공지 (where the header and the home preview lead). */
export function parseNewsTab(raw: string | string[] | undefined): NewsTab {
  return raw === 'guide' ? 'guide' : 'notice';
}
