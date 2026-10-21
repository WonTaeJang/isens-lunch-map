import PageHeading from '@/components/ui/page-heading';
import GuideStepList from '@/features/guide/guide-step-list';
import { parseNewsTab } from '@/features/notices/news-tab';
import NewsTabs from '@/features/notices/news-tabs';
import NoticeList from '@/features/notices/notice-list';
import { latestNotice } from '@/lib/notices/model';
import { getNotices } from '@/lib/server/notices';

export const metadata = { title: '소식·사용법 | Lunch Map' };

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  const initialTab = parseNewsTab(tab);
  const notices = getNotices();
  const latestId = latestNotice(notices)?.id ?? null;
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="NEWS & HOW TO USE"
        title="소식·사용법"
        description="새 소식과 Lunch Map을 쓰는 방법을 모았어요."
      />
      {/* key: following a link to another ?tab= on this page starts on that tab. */}
      <NewsTabs
        key={initialTab}
        initialTab={initialTab}
        latestNoticeId={latestId}
        notices={<NoticeList notices={notices} openId={latestId} />}
        guide={<GuideStepList />}
      />
    </main>
  );
}
