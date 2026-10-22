'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Tabs, { SwipeTabPanel } from '@/components/ui/tabs';
import { useMediaQuery } from '@/components/ui/use-media-query';
import { panelStep } from '@/components/ui/snap-panels';
import tabStyles from '@/components/ui/tabs.module.css';
import { prefersReducedMotion } from '@/lib/motion';
import { NEWS_TABS, type NewsTab } from './news-tab';
import { markNoticeRead } from './notice-read-store';
import styles from './notices.module.css';

/** Mobile uses native horizontal scrolling so the neighbouring panel follows the finger. */
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
  const wide = useMediaQuery('(min-width: 1200px)');
  const [tab, setTab] = useState(initialTab);
  const active = useRef(initialTab);
  const scroller = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const select = useCallback((next: NewsTab) => {
    if (active.current === next) return;
    active.current = next;
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(window.history.state, '', url);
  }, []);

  useEffect(() => {
    if ((wide || tab === 'notice') && latestNoticeId) markNoticeRead(latestNoticeId);
  }, [tab, latestNoticeId, wide]);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const mobile = window.matchMedia('(max-width: 760px)');
    let previousWidth = -1;
    const fit = () => {
      const index = active.current === 'notice' ? 0 : 1;
      const width = element.clientWidth;
      const panel = element.children[index] as HTMLElement;
      element.style.height = mobile.matches ? `${panel.offsetHeight}px` : '';
      // Resize/rotation aligns the current panel; content resizing must not interrupt a swipe.
      if (width !== previousWidth) {
        element.scrollLeft = mobile.matches ? index * panelStep(element, NEWS_TABS.length) : 0;
        previousWidth = width;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    for (const panel of element.children) observer.observe(panel);
    const onLayoutChange = () => {
      previousWidth = -1;
      fit();
    };
    mobile.addEventListener('change', onLayoutChange);
    return () => {
      observer.disconnect();
      mobile.removeEventListener('change', onLayoutChange);
    };
  }, []);

  useEffect(() => {
    const element = scroller.current;
    if (element && window.matchMedia('(max-width: 760px)').matches) {
      const panel = element.children[tab === 'notice' ? 0 : 1] as HTMLElement;
      element.style.height = `${panel.offsetHeight}px`;
    }
  }, [tab]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  function change(next: NewsTab) {
    const element = scroller.current;
    if (!element || !window.matchMedia('(max-width: 760px)').matches) {
      select(next);
      return;
    }
    element.scrollTo({
      left: (next === 'notice' ? 0 : 1) * panelStep(element, NEWS_TABS.length),
      behavior: prefersReducedMotion() ? 'instant' : 'smooth',
    });
    select(next);
  }

  return (
    <div className={styles.news}>
      <Tabs
        items={NEWS_TABS}
        value={tab}
        onChange={change}
        idPrefix="news"
        label="소식·사용법"
        className={`${tabStyles.underline} ${styles.newsTabs}`}
      />
      <div
        ref={scroller}
        className={styles.newsScroller}
        onScroll={() => {
          if (settleTimer.current) clearTimeout(settleTimer.current);
          settleTimer.current = setTimeout(() => {
            const element = scroller.current;
            if (!element || !window.matchMedia('(max-width: 760px)').matches) return;
            select(
              element.scrollLeft >= panelStep(element, NEWS_TABS.length) / 2 ? 'guide' : 'notice',
            );
          }, 150);
        }}
      >
        {NEWS_TABS.map(({ value, label }) => (
          <SwipeTabPanel
            key={value}
            idPrefix="news"
            value={value}
            selected={tab}
            expanded={wide}
            label={label}
            className={styles.newsPanel}
          >
            <h2 id={`news-heading-${value}`} className={styles.newsHeading}>
              {label}
            </h2>
            {value === 'notice' ? notices : guide}
          </SwipeTabPanel>
        ))}
      </div>
    </div>
  );
}
