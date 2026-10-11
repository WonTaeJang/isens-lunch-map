'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './ranking.module.css';

type Tab = { href: string; title: string };

/** Distance between two panels (a panel plus the gap); 0 when nothing scrolls (wide screens). */
function panelStep(element: HTMLElement, count: number) {
  return count > 1 ? (element.scrollWidth - element.clientWidth) / (count - 1) : 0;
}

/**
 * Narrow screens: the rankings sit side by side in a horizontal snap scroller, so a swipe shows
 * the next one; the tabs follow the swipe (and the URL's ?type=), and a tab tap slides there
 * without asking the server again. Wide screens show all rankings as columns and hide the tabs.
 */
export default function RankingTabs({
  tabs,
  initialIndex,
  children,
}: {
  tabs: readonly Tab[];
  initialIndex: number;
  /** One panel per tab, in the same order. */
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(initialIndex);
  const activeRef = useRef(initialIndex);

  // Narrow screens: show the active ranking (the linked ?type= at first, and again after a
  // resize such as rotating a tablet from columns to swiping) and make the scroller as tall as it.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const fit = () => {
      const step = panelStep(element, tabs.length);
      const panel = element.children[active] as HTMLElement | undefined;
      if (step && Math.round(element.scrollLeft / step) !== active) {
        element.scrollLeft = active * step;
      }
      element.style.height = step && panel ? `${panel.offsetHeight}px` : '';
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    for (const panel of element.children) observer.observe(panel);
    return () => observer.disconnect();
  }, [active, tabs.length]);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const step = panelStep(element, tabs.length);
        if (!step) return;
        const index = Math.min(tabs.length - 1, Math.max(0, Math.round(element.scrollLeft / step)));
        if (index === activeRef.current) return;
        activeRef.current = index;
        setActive(index);
        // Keep a reload or a shared link on the same ranking.
        window.history.replaceState(window.history.state, '', tabs[index].href);
      });
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('scroll', onScroll);
    };
  }, [tabs]);

  return (
    <>
      <nav className={styles.tabs} aria-label="랭킹 분류">
        {tabs.map((tab, index) => (
          <a
            key={tab.href}
            href={tab.href}
            aria-current={index === active ? 'page' : undefined}
            onClick={(event) => {
              const element = scroller.current;
              const step = element && panelStep(element, tabs.length);
              if (!element || !step) return;
              event.preventDefault();
              element.scrollTo({ left: index * step, behavior: 'smooth' });
            }}
          >
            {tab.title}
          </a>
        ))}
      </nav>
      <div ref={scroller} className={styles.columns}>
        {children}
      </div>
    </>
  );
}
