'use client';

import type { ReactNode } from 'react';
import { nextTabIndex } from './tabs-model';

type Props<T extends string> = {
  items: readonly { value: T; label: ReactNode; count?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  idPrefix: string;
  panelId?: string;
  label: string;
  className?: string;
};

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
      {items.map((item, index) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${item.value}`}
          aria-selected={value === item.value}
          aria-controls={panelId ?? `${idPrefix}-panel-${item.value}`}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            const next = nextTabIndex(event.key, index, items.length);
            if (next === null) return;
            event.preventDefault();
            onChange(items[next].value);
            const buttons =
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]',
              );
            buttons?.[next]?.focus();
          }}
        >
          {item.label}
          {item.count !== undefined && (
            <>
              {' '}
              <span>{item.count}</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
