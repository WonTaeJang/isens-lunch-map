import type { ReactNode } from 'react';
export default function CountBadge({children}: {children: ReactNode}) {
  return <span className="count">{children}</span>;
}
