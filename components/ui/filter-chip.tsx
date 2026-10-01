'use client';

import type { ReactNode } from 'react';

export default function FilterChip({ selected, onClick, children, className = '' }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return <button type="button" className={`filter-chip ${className}`.trim()} aria-pressed={selected} onClick={onClick}>{children}</button>;
}
