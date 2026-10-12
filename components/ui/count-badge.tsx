import type { ReactNode } from 'react';
export default function CountBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={className ? `count ${className}` : 'count'}>{children}</span>;
}
