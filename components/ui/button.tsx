import type { ComponentProps } from 'react';

type Props = ComponentProps<'button'> & { variant?: 'primary' | 'secondary'; loading?: boolean; loadingLabel?: string };
export default function Button({ variant = 'primary', loading = false, loadingLabel = '처리 중…', disabled, className = '', children, type = 'button', ...props }: Props) {
  return <button {...props} type={type} className={`button button-${variant} ${className}`.trim()} disabled={disabled || loading} aria-busy={loading || undefined}>{loading ? loadingLabel : children}</button>;
}
