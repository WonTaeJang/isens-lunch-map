'use client';

import type { ReactNode } from 'react';
import Button from '@/components/ui/button';
import styles from './admin.module.css';

type Props = {
  title: string;
  /** One or more `<p className="description">` explaining what the re-measure does. */
  description: ReactNode;
  busy: boolean;
  /** Shown on the preview button while it runs (the Button default otherwise). */
  loadingLabel?: string;
  message: string;
  error: string | null;
  /** True once a preview has loaded; `children` then render it. */
  previewed: boolean;
  changeCount: number;
  /** Start of the save button label, e.g. "재측정 거리" → "재측정 거리 3건 반영". */
  applyLabel: string;
  measure: (mode: 'preview' | 'apply') => Promise<void>;
  children?: ReactNode;
};

/** Shared shell of the admin re-measure sections: preview, review the result, then save it. */
export default function RemeasureSection({
  title,
  description,
  busy,
  loadingLabel,
  message,
  error,
  previewed,
  changeCount,
  applyLabel,
  measure,
  children,
}: Props) {
  return (
    <section className={styles.uploadSection}>
      <h2>{title}</h2>
      {description}
      <Button
        className={styles.spacedButton}
        loading={busy}
        loadingLabel={loadingLabel}
        disabled={!!error}
        onClick={() => measure('preview')}
      >
        재측정 결과 보기
      </Button>
      <p role="status" className="description">
        {message}
      </p>
      {previewed && (
        <div>
          {children}
          <Button
            className={styles.spacedButton}
            loading={busy}
            disabled={!changeCount}
            onClick={() => measure('apply')}
          >
            {applyLabel} {changeCount}건 반영
          </Button>
        </div>
      )}
    </section>
  );
}
