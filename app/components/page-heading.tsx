import type { ReactNode } from 'react';
export default function PageHeading({eyebrow, title, description, children}: {eyebrow: string; title: ReactNode; description: string; children?: ReactNode}) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="description">{description}</p></div>{children}</div>;
}
