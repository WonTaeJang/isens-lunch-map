'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Tabs, { TabPanel } from '@/components/ui/tabs';
import tabStyles from '@/components/ui/tabs.module.css';
import { NEWS_TABS, type NewsTab } from './news-tab';
import { markNoticeRead } from './notice-read-store';
import styles from './notices.module.css';

/** 공지 | 사용법 tabs. The open tab is kept in ?tab= and opening 공지 reads the latest notice. */
export default function NewsTabs({
  initialTab,
  latestNoticeId,
  notices,
  guide,
}: {
  initialTab: NewsTab;
  latestNoticeId: string | null;
  notices: ReactNode;
  guide: ReactNode;
}) {
  const [tab, setTab] = useState(initialTab);
  useEffect(() => {
    if (tab === 'notice' && latestNoticeId) markNoticeRead(latestNoticeId);
  }, [tab, latestNoticeId]);
  const change = (next: NewsTab) => {
    setTab(next);
    // Replaces the address without a navigation, so reloading or sharing keeps the tab.
    window.history.replaceState(null, '', `?tab=${next}`);
  };
  return (
    <div className={styles.news}>
      <Tabs
        items={NEWS_TABS}
        value={tab}
        onChange={change}
        idPrefix="news"
        label="소식·사용법"
        className={tabStyles.underline}
      />
      <TabPanel idPrefix="news" value="notice" selected={tab}>
        {notices}
      </TabPanel>
      <TabPanel idPrefix="news" value="guide" selected={tab}>
        {guide}
      </TabPanel>
    </div>
  );
}
