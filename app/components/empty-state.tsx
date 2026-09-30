import type { ReactNode } from 'react';
type Props = { title?: string; description?: string; icon?: ReactNode; action?: ReactNode; children?: ReactNode; variant?: 'list' | 'table'; role?: 'alert' | 'status' };
export default function EmptyState({title, description, icon, action, children, variant = 'list', role}: Props) {
  return <div className={`${variant}-empty`} role={role}>{icon && <span className="empty-symbol" aria-hidden="true">{icon}</span>}{title && <h3>{title}</h3>}{description && <p>{description}</p>}{children}{action}</div>;
}
