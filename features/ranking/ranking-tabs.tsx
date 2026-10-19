'use client';

import { prefersReducedMotion } from '@/lib/motion';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
  /** The tab a tap is scrolling to; the scroll and fit handlers leave the scroller alone until then. */
  const travel = useRef<{ index: number; timer: number } | null>(null);
  /** Shows tab `index` as active and keeps a reload or a shared link on it (?type=). */
  const select = useCallback(
    (index: number) => {
      if (index === activeRef.current) return;
      activeRef.current = index;
      setActive(index);
      window.history.replaceState(window.history.state, '', tabs[index].href);
    },
    [tabs],
  );

  // Narrow screens: show the active ranking (the linked ?type= at first, and again after a
  // resize such as rotating a tablet from columns to swiping) and make the scroller as tall as it.
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const fit = () => {
      const step = panelStep(element, tabs.length);
      const panel = element.children[active] as HTMLElement | undefined;
      if (step && !travel.current && Math.round(element.scrollLeft / step) !== active) {
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
        const moving = travel.current;
        if (moving) {
          if (Math.abs(element.scrollLeft - moving.index * step) > 1) return;
          window.clearTimeout(moving.timer);
          travel.current = null;
        }
        select(Math.min(tabs.length - 1, Math.max(0, Math.round(element.scrollLeft / step))));
      });
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('scroll', onScroll);
      if (travel.current) window.clearTimeout(travel.current.timer);
    };
  }, [tabs.length, select]);

  /**
   * A tab tap: a neighbour slides over; a farther tab jumps there (never sliding past the one in
   * between) and fades in. With reduced motion everything moves at once.
   */
  function goTo(element: HTMLElement, step: number, index: number) {
    const far = Math.abs(index - activeRef.current) > 1;
    const reduceMotion = prefersReducedMotion();
    if (travel.current) window.clearTimeout(travel.current.timer);
    // A swipe that interrupts the slide takes over after a moment.
    travel.current = { index, timer: window.setTimeout(() => (travel.current = null), 800) };
    select(index);
    element.scrollTo({ left: index * step, behavior: far || reduceMotion ? 'instant' : 'smooth' });
    if (far && !reduceMotion) {
      element.children[index]?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 200,
        easing: 'ease-out',
      });
    }
  }

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
              goTo(element, step, index);
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
