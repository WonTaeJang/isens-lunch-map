'use client';

import type { ReactNode } from 'react';

export default function FilterChip({
  selected,
  onClick,
  children,
  className = '',
  label,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** Accessible name and tooltip, for a chip that shows only an icon. */
  label?: string;
}) {
  return (
    <button
      type="button"
      className={`filter-chip ${className}`.trim()}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
