'use client';

import type { ReactNode } from 'react';
import { nextTabIndex } from './tabs-model';

type Props<T extends string> = {
  items: readonly { value: T; label: ReactNode; count?: ReactNode; href?: string }[];
  value: T;
  onChange: (value: T) => void;
  idPrefix: string;
  panelId?: string;
  label: string;
  className?: string;
};

/** The panel of tab `value`, labelled by its tab in `Tabs` with the same `idPrefix`; hidden unless selected. */
export function TabPanel({
  idPrefix,
  value,
  selected,
  children,
}: {
  idPrefix: string;
  value: string;
  selected: string;
  children: ReactNode;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${value}`}
      aria-labelledby={`${idPrefix}-tab-${value}`}
      hidden={selected !== value}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

/** Keep adjacent panels rendered for swiping, but only the selected one interactive.
 * Expanded layouts expose every panel as a separately labelled region. */
export function SwipeTabPanel({
  idPrefix,
  value,
  selected,
  expanded,
  label,
  className,
  children,
}: {
  idPrefix: string;
  value: string;
  selected: string;
  expanded: boolean;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const active = selected === value;
  return (
    <div
      className={className}
      role={expanded ? 'region' : 'tabpanel'}
      id={`${idPrefix}-panel-${value}`}
      aria-label={expanded ? label : undefined}
      aria-labelledby={expanded ? undefined : `${idPrefix}-tab-${value}`}
      aria-hidden={!expanded && !active}
      inert={!expanded && !active}
      data-active={active || undefined}
      tabIndex={expanded ? undefined : active ? 0 : -1}
    >
      {children}
    </div>
  );
}

export default function Tabs<T extends string>({
  items,
  value,
  onChange,
  idPrefix,
  panelId,
  label,
  className,
}: Props<T>) {
  return (
    <div className={className} role="tablist" aria-label={label}>
      {items.map((item, index) => {
        const Tag = item.href ? 'a' : 'button';
        return (
          <Tag
            key={item.value}
            type={item.href ? undefined : 'button'}
            href={item.href}
            role="tab"
            id={`${idPrefix}-tab-${item.value}`}
            aria-selected={value === item.value}
            aria-controls={panelId ?? `${idPrefix}-panel-${item.value}`}
            tabIndex={value === item.value ? 0 : -1}
            onClick={(event) => {
              if (item.href) {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
              }
              onChange(item.value);
            }}
            onKeyDown={(event) => {
              if (item.href && event.key === ' ') {
                event.preventDefault();
                onChange(item.value);
                return;
              }
              const next = nextTabIndex(event.key, index, items.length);
              if (next === null) return;
              event.preventDefault();
              onChange(items[next].value);
              const tabs =
                event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]');
              tabs?.[next]?.focus();
            }}
          >
            {item.label}
            {item.count !== undefined && (
              <>
                {' '}
                <span>{item.count}</span>
              </>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
